import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  RestaurantTable,
  MenuItem,
  TableOrder,
  TableSession,
  Round,
  OrderLineItem,
  Ingredient,
  Vendor,
  Recipe,
  StaffMember,
  StaffRole,
  Receipt,
  Payment,
  OrderPaymentStatus,
  TableStatus,
  PaymentMethod,
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
  seedRolePasswords,
  seedOrders,
  seedTableSessions,
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
  rolePasswords: Record<StaffRole, string>;
  tableSessions: TableSession[];
  payments: Payment[];
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
  toggleMenuAvailability: (menuItemId: string) => void;
  addMenuItem: (item: Omit<MenuItem, "id">) => void;
  clockIn: (staffId: string) => void;
  clockOut: (staffId: string) => void;
  login: (staffId: string) => void;
  logout: () => void;
  startBilling: (tableId: string) => void;
  recordPayment: (
    tableId: string,
    payment: {
      method: PaymentMethod;
      amount: number;
      reference: string;
    }
  ) => void;
  finalizeReceipt: (tableId: string) => Promise<Receipt>;
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
      orders: seedOrders,
      ingredients: seedIngredients,
      vendors: seedVendors,
      recipes: seedRecipes,
      staff: seedStaff,
      shifts: seedShifts,
      rolePasswords: seedRolePasswords,
      tableSessions: seedTableSessions,
      payments: [],
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
          const waiterId = s.currentStaffId ?? undefined;
          const session: TableSession = {
            id: makeId("session"),
            tableId,
            waiterId: waiterId ?? "unknown",
            openedAt: Date.now(),
          };
          return {
            orders: {
              ...s.orders,
              [tableId]: {
                id: makeId("order"),
                tableId,
                sessionId: session.id,
                waiterId,
                rounds: [firstRound],
                paymentStatus: "unpaid",
              },
            },
            tableSessions: [...s.tableSessions, session],
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

      toggleMenuAvailability: (menuItemId) =>
        set((s) => ({
          menu: s.menu.map((m) =>
            m.id === menuItemId ? { ...m, available: !m.available } : m
          ),
        })),

      addMenuItem: (item) =>
        set((s) => ({
          menu: [...s.menu, { ...item, id: makeId("menu") }],
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

      startBilling: (tableId) =>
        set((s) => {
          const order = s.orders[tableId];
          if (!order) return s;
          const billTotals = order.billTotals ?? getOrderTotal(order);
          return {
            orders: {
              ...s.orders,
              [tableId]: { ...order, billTotals },
            },
            tables: s.tables.map((t) =>
              t.id === tableId ? { ...t, status: "needs-bill" } : t
            ),
          };
        }),

      recordPayment: (tableId, payment) =>
        set((s) => {
          const order = s.orders[tableId];
          if (!order) return s;
          const waiterId = order.waiterId ?? s.currentStaffId ?? undefined;
          const newPayment: Payment = {
            id: makeId("payment"),
            orderId: order.id,
            sessionId: order.sessionId,
            tableId,
            waiterId,
            method: payment.method,
            amount: payment.amount,
            reference: payment.reference,
            paidAt: Date.now(),
          };
          const allPayments = [...s.payments, newPayment];
          const paidForOrder = allPayments
            .filter((p) => p.orderId === order.id)
            .reduce((sum, p) => sum + p.amount, 0);
          const billTotal = order.billTotals?.total ?? 0;
          const paymentStatus: OrderPaymentStatus =
            paidForOrder >= billTotal
              ? "paid"
              : paidForOrder > 0
              ? "partially_paid"
              : "unpaid";
          return {
            payments: allPayments,
            orders: {
              ...s.orders,
              [tableId]: { ...order, paymentStatus },
            },
          };
        }),

      finalizeReceipt: async (tableId) => {
        const s = get();
        const table = s.tables.find((t) => t.id === tableId);
        const order = s.orders[tableId];
        const lines = flattenOrderItems(order);
        const billTotals = order?.billTotals ?? getOrderTotal(order);
        const orderPayments = order
          ? s.payments.filter((p) => p.orderId === order.id)
          : [];
        const invoiceNumber = `KRA-ETIMS-${s.invoiceCounter + 1}`;
        const { qrDataUrl } = await simulateEtimsSigning({
          invoiceNumber,
          invoiceRef: orderPayments.map((p) => p.reference).join(", ") || "N/A",
          total: billTotals.total,
        });
        const receipt: Receipt = {
          id: makeId("receipt"),
          invoiceNumber,
          tableId,
          tableLabel: table ? tableLabel(table) : "Table",
          items: lines.map(({ item, roundIndex }) => ({
            menuItemId: item.menuItemId,
            name: item.name,
            qty: item.qty,
            price:
              item.price + item.addOns.reduce((sum, a) => sum + a.price, 0),
            lineTotal:
              (item.price + item.addOns.reduce((sum, a) => sum + a.price, 0)) *
              item.qty,
            roundIndex,
          })),
          subtotal: billTotals.subtotal,
          vat: billTotals.vat,
          total: billTotals.total,
          payments: orderPayments.map((p) => ({
            method: p.method,
            amount: p.amount,
            reference: p.reference,
          })),
          qrDataUrl,
          issuedAt: Date.now(),
        };
        set((st) => ({
          receipts: [...st.receipts, receipt],
          invoiceCounter: st.invoiceCounter + 1,
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
            tableSessions: s.tableSessions.map((sess) =>
              sess.tableId === tableId && sess.closedAt === undefined
                ? { ...sess, closedAt: Date.now() }
                : sess
            ),
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
      version: 8,
      migrate: (persistedState) => {
        const state = persistedState as Partial<PosState> & {
          ingredients?: Array<Record<string, unknown>>;
          recipes?: Array<Record<string, unknown>>;
          staff?: Array<Record<string, unknown>>;
          orders?: Record<string, Record<string, unknown>>;
          tableSessions?: unknown[];
          payments?: Array<Record<string, unknown>>;
        };
        const hasCurrentIngredientShape = state.ingredients?.every(
          (ing) => typeof ing.totalCost === "number"
        );
        const hasCurrentRecipeShape = state.recipes?.every(
          (r) => typeof r.menuItemId === "string"
        );
        const hasCurrentStaffShape = state.staff?.some(
          (m) => m.role === "Cashier"
        );
        const hasCurrentOrderShape = Object.values(state.orders ?? {}).every(
          (o) =>
            typeof o.paymentStatus === "string" &&
            typeof o.id === "string" &&
            typeof o.sessionId === "string"
        );
        const hasCurrentPaymentShape = state.payments?.every(
          (p) => typeof p.orderId === "string" && typeof p.sessionId === "string"
        );
        // Only backfill the demo orders/sessions for T2/T6/T8/T11 into a
        // session that has never had any real orders of its own — never
        // clobber a browser that's actually been used to serve tables.
        const ordersAreEmpty = Object.keys(state.orders ?? {}).length === 0;
        return {
          ...state,
          ingredients: hasCurrentIngredientShape
            ? state.ingredients
            : seedIngredients,
          recipes: hasCurrentRecipeShape ? state.recipes : seedRecipes,
          staff: hasCurrentStaffShape ? state.staff : seedStaff,
          orders: !hasCurrentOrderShape
            ? {}
            : ordersAreEmpty
            ? seedOrders
            : state.orders,
          tableSessions:
            ordersAreEmpty && (state.tableSessions?.length ?? 0) === 0
              ? seedTableSessions
              : state.tableSessions,
          payments: hasCurrentPaymentShape ? state.payments : [],
          // Demo-grade role passwords have no in-app way to change them yet,
          // so always trust the latest seed values rather than whatever got
          // persisted from an earlier version of this file.
          rolePasswords: seedRolePasswords,
        };
      },
    }
  )
);
