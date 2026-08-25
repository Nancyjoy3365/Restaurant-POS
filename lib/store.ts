import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  RestaurantTable,
  MenuItem,
  TableOrder,
  Round,
  OrderLineItem,
  Ingredient,
  Vendor,
  Recipe,
  StaffMember,
  Receipt,
  TableStatus,
  PaymentMethod,
  SplitSummary,
  AddOn,
  ShiftEntry,
} from "./types";
import {
  seedTables,
  seedMenu,
  seedIngredients,
  seedVendors,
  seedRecipes,
  seedStaff,
  seedShifts,
} from "./seed-data";
import { calcBill, makeId, tableLabel, flattenOrderItems, lineRawTotal } from "./utils";
import { simulateEtimsSigning } from "./mock-integrations";

interface PosState {
  tables: RestaurantTable[];
  menu: MenuItem[];
  orders: Record<string, TableOrder>;
  ingredients: Ingredient[];
  vendors: Vendor[];
  recipes: Recipe[];
  staff: StaffMember[];
  shifts: ShiftEntry[];
  receipts: Receipt[];
  invoiceCounter: number;
  currentStaffId: string | null;

  renameTable: (id: string, name: string) => void;
  setTableStatus: (id: string, status: TableStatus) => void;
  ensureOrder: (tableId: string) => void;
  addRound: (tableId: string) => void;
  addItem: (
    tableId: string,
    roundId: string,
    menuItem: MenuItem,
    opts: { spiceLevel?: string; addOns?: AddOn[] }
  ) => void;
  updateItemQty: (tableId: string, itemId: string, qty: number) => void;
  removeItem: (tableId: string, itemId: string) => void;
  toggleItemGuest: (tableId: string, itemId: string, guestId: string) => void;
  setGuestCount: (tableId: string, count: number) => void;
  toggleMenuAvailability: (menuItemId: string) => void;
  clockIn: (staffId: string) => void;
  clockOut: (staffId: string) => void;
  login: (staffId: string) => void;
  logout: () => void;
  confirmPayment: (
    tableId: string,
    method: PaymentMethod,
    paymentRef: string,
    splitSummary?: SplitSummary
  ) => Promise<Receipt>;
  closeTable: (tableId: string) => void;
}

export function getOrderTotal(order: TableOrder | undefined) {
  const lines = flattenOrderItems(order);
  const raw = lines.reduce((sum, { item }) => sum + lineRawTotal(item), 0);
  return calcBill(raw);
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      tables: seedTables,
      menu: seedMenu,
      orders: {},
      ingredients: seedIngredients,
      vendors: seedVendors,
      recipes: seedRecipes,
      staff: seedStaff,
      shifts: seedShifts,
      receipts: [],
      invoiceCounter: 10482,
      currentStaffId: null,

      renameTable: (id, name) =>
        set((s) => ({
          tables: s.tables.map((t) =>
            t.id === id ? { ...t, customName: name.trim() || undefined } : t
          ),
        })),

      setTableStatus: (id, status) =>
        set((s) => ({
          tables: s.tables.map((t) => (t.id === id ? { ...t, status } : t)),
        })),

      ensureOrder: (tableId) =>
        set((s) => {
          if (s.orders[tableId]) return s;
          const firstRound: Round = {
            id: makeId("round"),
            index: 1,
            createdAt: Date.now(),
            items: [],
          };
          return {
            orders: {
              ...s.orders,
              [tableId]: { tableId, rounds: [firstRound], guestCount: 1 },
            },
          };
        }),

      addRound: (tableId) =>
        set((s) => {
          const order = s.orders[tableId];
          if (!order) return s;
          const newRound: Round = {
            id: makeId("round"),
            index: order.rounds.length + 1,
            createdAt: Date.now(),
            items: [],
          };
          return {
            orders: {
              ...s.orders,
              [tableId]: { ...order, rounds: [...order.rounds, newRound] },
            },
          };
        }),

      addItem: (tableId, roundId, menuItem, opts) =>
        set((s) => {
          const order = s.orders[tableId];
          if (!order) return s;
          const newLine: OrderLineItem = {
            id: makeId("line"),
            menuItemId: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            qty: 1,
            veg: menuItem.veg,
            comboTag: menuItem.comboTag,
            spiceLevel: opts.spiceLevel,
            addOns: opts.addOns ?? [],
            assignedGuests: [],
          };
          const rounds = order.rounds.map((r) =>
            r.id === roundId ? { ...r, items: [...r.items, newLine] } : r
          );
          return { orders: { ...s.orders, [tableId]: { ...order, rounds } } };
        }),

      updateItemQty: (tableId, itemId, qty) =>
        set((s) => {
          const order = s.orders[tableId];
          if (!order) return s;
          const rounds = order.rounds.map((r) => ({
            ...r,
            items:
              qty <= 0
                ? r.items.filter((i) => i.id !== itemId)
                : r.items.map((i) => (i.id === itemId ? { ...i, qty } : i)),
          }));
          return { orders: { ...s.orders, [tableId]: { ...order, rounds } } };
        }),

      removeItem: (tableId, itemId) =>
        set((s) => {
          const order = s.orders[tableId];
          if (!order) return s;
          const rounds = order.rounds.map((r) => ({
            ...r,
            items: r.items.filter((i) => i.id !== itemId),
          }));
          return { orders: { ...s.orders, [tableId]: { ...order, rounds } } };
        }),

      toggleItemGuest: (tableId, itemId, guestId) =>
        set((s) => {
          const order = s.orders[tableId];
          if (!order) return s;
          const rounds = order.rounds.map((r) => ({
            ...r,
            items: r.items.map((i) => {
              if (i.id !== itemId) return i;
              const has = i.assignedGuests.includes(guestId);
              return {
                ...i,
                assignedGuests: has
                  ? i.assignedGuests.filter((g) => g !== guestId)
                  : [...i.assignedGuests, guestId],
              };
            }),
          }));
          return { orders: { ...s.orders, [tableId]: { ...order, rounds } } };
        }),

      setGuestCount: (tableId, count) =>
        set((s) => {
          const order = s.orders[tableId];
          if (!order) return s;
          return {
            orders: {
              ...s.orders,
              [tableId]: { ...order, guestCount: Math.max(1, count) },
            },
          };
        }),

      toggleMenuAvailability: (menuItemId) =>
        set((s) => ({
          menu: s.menu.map((m) =>
            m.id === menuItemId ? { ...m, available: !m.available } : m
          ),
        })),

      clockIn: (staffId) =>
        set((s) => {
          const alreadyOn = s.shifts.some(
            (sh) => sh.staffId === staffId && sh.clockOut === undefined
          );
          if (alreadyOn) return s;
          const shift: ShiftEntry = {
            id: makeId("shift"),
            staffId,
            clockIn: Date.now(),
          };
          return { shifts: [...s.shifts, shift] };
        }),

      clockOut: (staffId) =>
        set((s) => ({
          shifts: s.shifts.map((sh) =>
            sh.staffId === staffId && sh.clockOut === undefined
              ? { ...sh, clockOut: Date.now() }
              : sh
          ),
        })),

      login: (staffId) => set({ currentStaffId: staffId }),
      logout: () => set({ currentStaffId: null }),

      confirmPayment: async (tableId, method, paymentRef, splitSummary) => {
        const s = get();
        const table = s.tables.find((t) => t.id === tableId);
        const order = s.orders[tableId];
        const lines = flattenOrderItems(order);
        const { subtotal, vat, total } = getOrderTotal(order);
        const invoiceNumber = `KRA-ETIMS-${s.invoiceCounter + 1}`;
        const { qrDataUrl } = await simulateEtimsSigning({
          invoiceNumber,
          invoiceRef: paymentRef,
          total,
        });
        const receipt: Receipt = {
          id: makeId("receipt"),
          invoiceNumber,
          tableId,
          tableLabel: table ? tableLabel(table) : "Table",
          items: lines.map(({ item, roundIndex }) => ({
            name: item.name,
            qty: item.qty,
            price:
              item.price + item.addOns.reduce((sum, a) => sum + a.price, 0),
            lineTotal:
              (item.price + item.addOns.reduce((sum, a) => sum + a.price, 0)) *
              item.qty,
            roundIndex,
          })),
          subtotal,
          vat,
          total,
          paymentMethod: method,
          paymentRef,
          qrDataUrl,
          issuedAt: Date.now(),
          splitSummary,
        };
        set((st) => ({
          receipts: [...st.receipts, receipt],
          invoiceCounter: st.invoiceCounter + 1,
          tables: st.tables.map((t) =>
            t.id === tableId ? { ...t, status: "needs-bill" } : t
          ),
        }));
        return receipt;
      },

      closeTable: (tableId) =>
        set((s) => {
          const restOrders = Object.fromEntries(
            Object.entries(s.orders).filter(([id]) => id !== tableId)
          );
          return {
            orders: restOrders,
            tables: s.tables.map((t) =>
              t.id === tableId
                ? { ...t, status: "free", customName: undefined }
                : t
            ),
          };
        }),
    }),
    {
      name: "pos-storage",
      version: 1,
    }
  )
);
