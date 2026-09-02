import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  MenuItem,
  TicketOrder,
  Ticket,
  TicketStatus,
  Round,
  OrderLineItem,
  Ingredient,
  Vendor,
  Recipe,
  StaffMember,
  Receipt,
  Payment,
  OrderPaymentStatus,
  PaymentMethod,
  AddOn,
  ShiftEntry,
  VoidEntry,
  CashDrop,
  LeaveRecord,
  IncentiveRecord,
} from "./types";
import {
  seedMenu,
  seedIngredients,
  seedVendors,
  seedRecipes,
  seedStaff,
  seedShifts,
  STAFF_PIN,
  seedOrders,
  seedTickets,
  RETIRED_SEED_INGREDIENT_IDS,
  RETIRED_SEED_VENDOR_IDS,
  RETIRED_SEED_MENU_IDS,
} from "./seed-data";
import { calcBill, makeId, flattenOrderItems, lineRawTotal } from "./utils";
import { simulateEtimsSigning } from "./mock-integrations";

interface PosState {
  menu: MenuItem[];
  orders: Record<string, TicketOrder>;
  tickets: Ticket[];
  ingredients: Ingredient[];
  vendors: Vendor[];
  recipes: Recipe[];
  staff: StaffMember[];
  shifts: ShiftEntry[];
  staffPin: string;
  payments: Payment[];
  receipts: Receipt[];
  voids: VoidEntry[];
  cashDrops: CashDrop[];
  leaveRecords: LeaveRecord[];
  incentiveRecords: IncentiveRecord[];
  ticketCounter: number;
  invoiceCounter: number;
  currentStaffId: string | null;

  createTicket: (locationNote?: string) => string;
  addRound: (ticketId: string) => void;
  addItem: (
    ticketId: string,
    roundId: string,
    menuItem: MenuItem,
    opts: { spiceLevel?: string; addOns?: AddOn[] }
  ) => void;
  updateItemQty: (ticketId: string, itemId: string, qty: number) => void;
  removeItem: (ticketId: string, itemId: string) => void;
  holdOrder: (ticketId: string) => void;
  resumeOrder: (ticketId: string) => void;
  heldOrderCountForWaiter: (waiterId: string | null) => number;
  sendRoundToKitchen: (ticketId: string, roundId: string) => void;
  toggleItemReady: (ticketId: string, itemId: string) => void;
  markAllItemsReady: (ticketId: string) => void;
  updateItemNote: (ticketId: string, itemId: string, note: string) => void;
  voidItem: (ticketId: string, itemId: string, reason: string) => void;
  toggleMenuAvailability: (menuItemId: string) => void;
  toggleMenuPriority: (menuItemId: string) => void;
  addMenuItem: (item: Omit<MenuItem, "id">) => void;
  updateMenuItem: (menuItemId: string, updates: Omit<MenuItem, "id">) => void;
  addIngredient: (item: Omit<Ingredient, "id">) => void;
  updateIngredient: (ingredientId: string, updates: Omit<Ingredient, "id">) => void;
  addVendor: (vendor: Omit<Vendor, "id">) => void;
  updateVendor: (vendorId: string, updates: Omit<Vendor, "id">) => void;
  addStaffMember: (member: Omit<StaffMember, "id">) => string;
  clockIn: (staffId: string) => void;
  clockOut: (staffId: string) => void;
  login: (staffId: string) => void;
  logout: () => void;
  cancelEmptyTickets: () => void;
  startBilling: (ticketId: string) => void;
  recordPayment: (
    ticketId: string,
    payment: {
      method: PaymentMethod;
      amount: number;
      reference: string;
      customerName?: string;
      isCashSubstitution?: boolean;
    }
  ) => void;
  finalizeReceipt: (ticketId: string) => Promise<Receipt>;
  reverseLastPayment: (ticketId: string) => void;
  recordCashDrop: (
    waiterId: string,
    amount: number,
    expectedAmount: number,
    method: PaymentMethod,
    reference?: string,
    note?: string
  ) => void;
  deleteCashDrop: (dropId: string) => void;
  addLeaveRecord: (record: Omit<LeaveRecord, "id">) => void;
  updateLeaveRecord: (leaveId: string, updates: Omit<LeaveRecord, "id">) => void;
  deleteLeaveRecord: (leaveId: string) => void;
  addIncentiveRecord: (record: Omit<IncentiveRecord, "id">) => void;
}

export const MAX_HELD_ORDERS_PER_WAITER = 3;

export function getOrderTotal(order: TicketOrder | undefined) {
  const lines = flattenOrderItems(order);
  const raw = lines.reduce((sum, { item }) => sum + lineRawTotal(item), 0);
  return calcBill(raw);
}

// Rounds already covered by a finalized receipt are a closed, fiscally
// signed cycle — they must never be re-billed or have their total change.
// Anything ordered afterward (a new round, or more items) belongs to the
// next cycle and gets its own bill/receipt/invoice number.
export function currentCycleNumber(order: TicketOrder | undefined): number {
  return (order?.billedThroughRoundIndex ?? 0) + 1;
}

export function unbilledOrderTotal(order: TicketOrder) {
  const billedThrough = order.billedThroughRoundIndex ?? 0;
  const unbilledRounds = order.rounds.filter((r) => r.index > billedThrough);
  return getOrderTotal({ ...order, rounds: unbilledRounds });
}

export function cyclePaidAmount(payments: Payment[], order: TicketOrder | undefined): number {
  if (!order) return 0;
  const cycleNumber = currentCycleNumber(order);
  return payments
    .filter((p) => p.orderId === order.id && (p.billingCycle ?? 1) === cycleNumber)
    .reduce((sum, p) => sum + p.amount, 0);
}

export function paymentsForCurrentCycle(payments: Payment[], order: TicketOrder | undefined): Payment[] {
  if (!order) return [];
  const cycleNumber = currentCycleNumber(order);
  return payments.filter(
    (p) => p.orderId === order.id && (p.billingCycle ?? 1) === cycleNumber
  );
}

// Once a bill has been started for the current cycle, keep its total in
// sync as items are added/adjusted — a growing/shrinking ticket should
// always reflect what's actually on it, not a number frozen from an
// earlier click.
function withRefreshedBillTotals(order: TicketOrder): TicketOrder {
  if (!order.billTotals) return order;
  return { ...order, billTotals: unbilledOrderTotal(order) };
}

// An order that never received a single item (e.g. "+ New Order" tapped
// then abandoned) isn't a real order — it should never persist as a
// visible open ticket, held or otherwise. Shared by the logout cleanup and
// the general sweep run from the ticket-listing pages.
function purgeEmptyTickets(s: {
  tickets: Ticket[];
  orders: Record<string, TicketOrder>;
}): Pick<PosState, "tickets" | "orders"> | null {
  const emptyTicketIds = new Set(
    s.tickets
      .filter(
        (t) =>
          t.status === "open" &&
          s.orders[t.id]?.rounds.every((r) => r.items.length === 0)
      )
      .map((t) => t.id)
  );
  if (emptyTicketIds.size === 0) return null;
  return {
    tickets: s.tickets.filter((t) => !emptyTicketIds.has(t.id)),
    orders: Object.fromEntries(
      Object.entries(s.orders).filter(([id]) => !emptyTicketIds.has(id))
    ),
  };
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      menu: seedMenu,
      orders: seedOrders,
      tickets: seedTickets,
      ingredients: seedIngredients,
      vendors: seedVendors,
      recipes: seedRecipes,
      staff: seedStaff,
      shifts: seedShifts,
      staffPin: STAFF_PIN,
      payments: [],
      receipts: [],
      voids: [],
      cashDrops: [],
      leaveRecords: [],
      incentiveRecords: [],
      ticketCounter: seedTickets.length,
      invoiceCounter: 10482,
      currentStaffId: null,

      createTicket: (locationNote) => {
        const newId = makeId("ticket");
        set((s) => {
          const displayNumber = s.ticketCounter + 1;
          const ticket: Ticket = {
            id: newId,
            displayNumber,
            waiterId: s.currentStaffId ?? "unknown",
            locationNote: locationNote?.trim() || undefined,
            status: "open",
            openedAt: Date.now(),
          };
          const firstRound: Round = {
            id: makeId("round"),
            index: 1,
            createdAt: Date.now(),
            items: [],
          };
          const order: TicketOrder = {
            id: makeId("order"),
            ticketId: newId,
            waiterId: ticket.waiterId,
            rounds: [firstRound],
            paymentStatus: "unpaid",
          };
          return {
            ticketCounter: displayNumber,
            tickets: [...s.tickets, ticket],
            orders: { ...s.orders, [newId]: order },
          };
        });
        return newId;
      },

      addRound: (ticketId) =>
        set((s) => {
          const order = s.orders[ticketId];
          if (!order) return s;
          // Reuse the trailing round if it's already empty (e.g. the fresh
          // round sendRoundToKitchen just created) instead of piling on
          // another unused one — otherwise round numbers inflate with
          // throwaway empty rounds every time this is clicked without an
          // item actually landing in the previous one.
          const lastRound = order.rounds[order.rounds.length - 1];
          if (lastRound && lastRound.items.length === 0) return s;
          const newRound: Round = {
            id: makeId("round"),
            index: order.rounds.length + 1,
            createdAt: Date.now(),
            items: [],
          };
          return {
            orders: {
              ...s.orders,
              [ticketId]: { ...order, rounds: [...order.rounds, newRound] },
            },
          };
        }),

      addItem: (ticketId, roundId, menuItem, opts) =>
        set((s) => {
          const order = s.orders[ticketId];
          if (!order) return s;
          const addOns = opts.addOns ?? [];
          const addOnKey = addOns.map((a) => a.name).sort().join("|");
          const makeLine = (): OrderLineItem => ({
            id: makeId("line"),
            menuItemId: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            qty: 1,
            veg: menuItem.veg,
            comboTag: menuItem.comboTag,
            spiceLevel: opts.spiceLevel,
            addOns,
          });

          // A round already covered by a finalized receipt is closed —
          // items ordered after that must start a fresh round so they
          // land in the next (unbilled) billing cycle instead of silently
          // amending an already-issued invoice.
          const billedThrough = order.billedThroughRoundIndex ?? 0;
          const targetRound = order.rounds.find((r) => r.id === roundId);
          const needsNewRound = !targetRound || targetRound.index <= billedThrough;

          let rounds: Round[];
          if (needsNewRound) {
            const freshRound: Round = {
              id: makeId("round"),
              index: order.rounds.length + 1,
              createdAt: Date.now(),
              items: [makeLine()],
            };
            rounds = [...order.rounds, freshRound];
          } else {
            rounds = order.rounds.map((r) => {
              if (r.id !== roundId) return r;
              const existing = r.items.find(
                (i) =>
                  i.menuItemId === menuItem.id &&
                  i.spiceLevel === opts.spiceLevel &&
                  i.addOns.map((a) => a.name).sort().join("|") === addOnKey
              );
              if (existing) {
                return {
                  ...r,
                  items: r.items.map((i) =>
                    i.id === existing.id ? { ...i, qty: i.qty + 1 } : i
                  ),
                };
              }
              return { ...r, items: [...r.items, makeLine()] };
            });
          }

          const paymentStatus =
            order.paymentStatus === "paid" ? "unpaid" : order.paymentStatus;

          const updated = withRefreshedBillTotals({
            ...order,
            rounds,
            paymentStatus,
          });

          return { orders: { ...s.orders, [ticketId]: updated } };
        }),

      updateItemQty: (ticketId, itemId, qty) =>
        set((s) => {
          const order = s.orders[ticketId];
          if (!order) return s;
          const rounds = order.rounds.map((r) => ({
            ...r,
            items:
              qty <= 0
                ? r.items.filter((i) => i.id !== itemId)
                : r.items.map((i) => (i.id === itemId ? { ...i, qty } : i)),
          }));
          const updated = withRefreshedBillTotals({ ...order, rounds });
          return { orders: { ...s.orders, [ticketId]: updated } };
        }),

      removeItem: (ticketId, itemId) =>
        set((s) => {
          const order = s.orders[ticketId];
          if (!order) return s;
          const rounds = order.rounds.map((r) => ({
            ...r,
            items: r.items.filter((i) => i.id !== itemId),
          }));
          const updated = withRefreshedBillTotals({ ...order, rounds });
          return { orders: { ...s.orders, [ticketId]: updated } };
        }),

      heldOrderCountForWaiter: (waiterId) => {
        if (!waiterId) return 0;
        return Object.values(get().orders).filter(
          (o) => o.onHold && o.waiterId === waiterId
        ).length;
      },

      holdOrder: (ticketId) =>
        set((s) => {
          const order = s.orders[ticketId];
          if (!order || order.onHold) return s;
          const hasItems = order.rounds.some((r) => r.items.length > 0);
          if (!hasItems) return s;
          const heldCount = Object.values(s.orders).filter(
            (o) => o.onHold && o.waiterId === order.waiterId
          ).length;
          if (heldCount >= MAX_HELD_ORDERS_PER_WAITER) return s;
          return {
            orders: {
              ...s.orders,
              [ticketId]: { ...order, onHold: true },
            },
          };
        }),

      resumeOrder: (ticketId) =>
        set((s) => {
          const order = s.orders[ticketId];
          if (!order || !order.onHold) return s;
          return {
            orders: {
              ...s.orders,
              [ticketId]: { ...order, onHold: false },
            },
          };
        }),

      sendRoundToKitchen: (ticketId, roundId) =>
        set((s) => {
          const order = s.orders[ticketId];
          if (!order) return s;
          const targetRound = order.rounds.find((r) => r.id === roundId);
          if (!targetRound || targetRound.items.length === 0) return s;
          const sentRounds = order.rounds.map((r) =>
            r.id === roundId
              ? {
                  ...r,
                  sentAt: Date.now(),
                  items: r.items.map((i) => ({ ...i, sentToKitchen: true })),
                }
              : r
          );
          // Sending to kitchen clears the working list for this ticket —
          // the next items ordered (e.g. mains after starters) start a
          // fresh round, rather than piling onto the sent one.
          const freshRound: Round = {
            id: makeId("round"),
            index: sentRounds.length + 1,
            createdAt: Date.now(),
            items: [],
          };
          return {
            orders: {
              ...s.orders,
              [ticketId]: {
                ...order,
                rounds: [...sentRounds, freshRound],
                onHold: true,
              },
            },
          };
        }),

      toggleItemReady: (ticketId, itemId) =>
        set((s) => {
          const order = s.orders[ticketId];
          if (!order) return s;
          const rounds = order.rounds.map((r) => ({
            ...r,
            items: r.items.map((i) =>
              i.id === itemId ? { ...i, kitchenReady: !i.kitchenReady } : i
            ),
          }));
          // The moment every sent item is ready, the kitchen's part is
          // done — hand the ticket back to the waiter automatically rather
          // than requiring a separate "Mark All Ready" click.
          const allSentItemsReady = rounds
            .flatMap((r) => r.items)
            .filter((i) => i.sentToKitchen)
            .every((i) => i.kitchenReady);
          return {
            orders: {
              ...s.orders,
              [ticketId]: {
                ...order,
                rounds,
                onHold: allSentItemsReady ? false : order.onHold,
              },
            },
          };
        }),

      markAllItemsReady: (ticketId) =>
        set((s) => {
          const order = s.orders[ticketId];
          if (!order) return s;
          const rounds = order.rounds.map((r) => ({
            ...r,
            items: r.items.map((i) =>
              i.sentToKitchen ? { ...i, kitchenReady: true } : i
            ),
          }));
          return {
            orders: {
              ...s.orders,
              [ticketId]: { ...order, rounds, onHold: false },
            },
          };
        }),

      updateItemNote: (ticketId, itemId, note) =>
        set((s) => {
          const order = s.orders[ticketId];
          if (!order) return s;
          const trimmed = note.trim();
          const rounds = order.rounds.map((r) => ({
            ...r,
            items: r.items.map((i) =>
              i.id === itemId ? { ...i, note: trimmed || undefined } : i
            ),
          }));
          return { orders: { ...s.orders, [ticketId]: { ...order, rounds } } };
        }),

      voidItem: (ticketId, itemId, reason) =>
        set((s) => {
          const order = s.orders[ticketId];
          if (!order) return s;
          let voided: OrderLineItem | undefined;
          const rounds = order.rounds.map((r) => {
            const found = r.items.find((i) => i.id === itemId);
            if (found) voided = found;
            return { ...r, items: r.items.filter((i) => i.id !== itemId) };
          });
          if (!voided) return s;
          const entry: VoidEntry = {
            id: makeId("void"),
            ticketId,
            orderId: order.id,
            itemId,
            itemName: voided.name,
            qty: voided.qty,
            reason,
            staffId: s.currentStaffId ?? undefined,
            voidedAt: Date.now(),
          };
          const updated = withRefreshedBillTotals({ ...order, rounds });
          return {
            orders: { ...s.orders, [ticketId]: updated },
            voids: [...s.voids, entry],
          };
        }),

      toggleMenuAvailability: (menuItemId) =>
        set((s) => ({
          menu: s.menu.map((m) =>
            m.id === menuItemId ? { ...m, available: !m.available } : m
          ),
        })),

      toggleMenuPriority: (menuItemId) =>
        set((s) => ({
          menu: s.menu.map((m) =>
            m.id === menuItemId ? { ...m, isPriority: !m.isPriority } : m
          ),
        })),

      addMenuItem: (item) =>
        set((s) => ({
          menu: [...s.menu, { ...item, id: makeId("menu") }],
        })),

      updateMenuItem: (menuItemId, updates) =>
        set((s) => ({
          menu: s.menu.map((m) =>
            m.id === menuItemId ? { ...updates, id: m.id } : m
          ),
        })),

      addIngredient: (item) =>
        set((s) => ({
          ingredients: [...s.ingredients, { ...item, id: makeId("ingredient") }],
        })),

      updateIngredient: (ingredientId, updates) =>
        set((s) => ({
          ingredients: s.ingredients.map((ing) =>
            ing.id === ingredientId ? { ...updates, id: ing.id } : ing
          ),
        })),

      addVendor: (vendor) =>
        set((s) => ({
          vendors: [...s.vendors, { ...vendor, id: makeId("vendor") }],
        })),

      updateVendor: (vendorId, updates) =>
        set((s) => ({
          vendors: s.vendors.map((v) =>
            v.id === vendorId ? { ...updates, id: v.id } : v
          ),
        })),

      addStaffMember: (member) => {
        const id = makeId("staff");
        set((s) => ({ staff: [...s.staff, { ...member, id }] }));
        return id;
      },

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
      logout: () =>
        set((s) => ({ currentStaffId: null, ...(purgeEmptyTickets(s) ?? {}) })),

      cancelEmptyTickets: () =>
        set((s) => purgeEmptyTickets(s) ?? s),

      startBilling: (ticketId) =>
        set((s) => {
          const order = s.orders[ticketId];
          if (!order) return s;
          const billTotals = unbilledOrderTotal(order);
          const paidForCycle = cyclePaidAmount(s.payments, order);
          const paymentStatus: OrderPaymentStatus =
            billTotals.total > 0 && paidForCycle >= billTotals.total
              ? "paid"
              : paidForCycle > 0
              ? "partially_paid"
              : "unpaid";
          return {
            orders: {
              ...s.orders,
              [ticketId]: { ...order, billTotals, onHold: false, paymentStatus },
            },
          };
        }),

      recordPayment: (ticketId, payment) =>
        set((s) => {
          const order = s.orders[ticketId];
          if (!order) return s;
          // Sales credit always follows the ticket's own owner — never
          // whoever happens to be logged in when the payment is recorded
          // (a cashier or a covering waiter must never pick up someone
          // else's credit).
          const newPayment: Payment = {
            id: makeId("payment"),
            orderId: order.id,
            ticketId,
            waiterId: order.waiterId,
            // Who physically recorded it — audit/display only.
            collectedByStaffId: s.currentStaffId ?? undefined,
            method: payment.method,
            amount: payment.amount,
            reference: payment.reference,
            customerName: payment.customerName,
            isCashSubstitution:
              payment.method === "mpesa" ? payment.isCashSubstitution : undefined,
            billingCycle: currentCycleNumber(order),
            paidAt: Date.now(),
          };
          const allPayments = [...s.payments, newPayment];
          const paidForCycle = cyclePaidAmount(allPayments, order);
          const billTotal = order.billTotals?.total ?? 0;
          const paymentStatus: OrderPaymentStatus =
            billTotal > 0 && paidForCycle >= billTotal
              ? "paid"
              : paidForCycle > 0
              ? "partially_paid"
              : "unpaid";
          return {
            payments: allPayments,
            orders: {
              ...s.orders,
              [ticketId]: { ...order, paymentStatus },
            },
            // Fully paid — the ticket is done. There's no table to free;
            // it just disappears from every active view immediately.
            tickets:
              paymentStatus === "paid"
                ? s.tickets.map((t) =>
                    t.id === ticketId
                      ? { ...t, status: "paid" as TicketStatus, closedAt: Date.now() }
                      : t
                  )
                : s.tickets,
          };
        }),

      finalizeReceipt: async (ticketId) => {
        const s = get();
        const order = s.orders[ticketId];
        const ticket = s.tickets.find((t) => t.id === ticketId);
        const billedThrough = order?.billedThroughRoundIndex ?? 0;
        const unbilledRounds =
          order?.rounds.filter((r) => r.index > billedThrough) ?? [];
        const scopedOrder = order ? { ...order, rounds: unbilledRounds } : undefined;
        const lines = flattenOrderItems(scopedOrder);
        const billTotals = order?.billTotals ?? getOrderTotal(scopedOrder);
        const orderPayments = paymentsForCurrentCycle(s.payments, order);
        const invoiceNumber = `KRA-ETIMS-${s.invoiceCounter + 1}`;
        const { qrDataUrl } = await simulateEtimsSigning({
          invoiceNumber,
          invoiceRef: orderPayments.map((p) => p.reference).join(", ") || "N/A",
          total: billTotals.total,
        });
        const receipt: Receipt = {
          id: makeId("receipt"),
          invoiceNumber,
          ticketId,
          ticketLabel: ticket ? `Order No. ${ticket.displayNumber}` : "Order",
          locationNote: ticket?.locationNote,
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
            customerName: p.customerName,
          })),
          qrDataUrl,
          issuedAt: Date.now(),
        };
        set((st) => {
          const cur = st.orders[ticketId];
          return {
            receipts: [...st.receipts, receipt],
            invoiceCounter: st.invoiceCounter + 1,
            orders: cur
              ? {
                  ...st.orders,
                  [ticketId]: { ...cur, billedThroughRoundIndex: cur.rounds.length },
                }
              : st.orders,
          };
        });
        return receipt;
      },

      reverseLastPayment: (ticketId) =>
        set((s) => {
          const order = s.orders[ticketId];
          if (!order) return s;
          const cyclePayments = paymentsForCurrentCycle(s.payments, order);
          if (cyclePayments.length === 0) return s;
          const last = cyclePayments.reduce((a, b) =>
            a.paidAt > b.paidAt ? a : b
          );
          const remainingPayments = s.payments.filter((p) => p.id !== last.id);
          const paidForCycle = cyclePaidAmount(remainingPayments, order);
          const billTotal = order.billTotals?.total ?? 0;
          const paymentStatus: OrderPaymentStatus =
            billTotal > 0 && paidForCycle >= billTotal
              ? "paid"
              : paidForCycle > 0
              ? "partially_paid"
              : "unpaid";
          return {
            payments: remainingPayments,
            orders: { ...s.orders, [ticketId]: { ...order, paymentStatus } },
            // A reversal that drops it back below fully-paid re-opens the
            // ticket — it was only ever hidden because it was settled.
            tickets:
              paymentStatus !== "paid"
                ? s.tickets.map((t) =>
                    t.id === ticketId
                      ? { ...t, status: "open" as TicketStatus, closedAt: undefined }
                      : t
                  )
                : s.tickets,
          };
        }),

      recordCashDrop: (waiterId, amount, expectedAmount, method, reference, note) =>
        set((s) => {
          if (amount <= 0) return s;
          const drop: CashDrop = {
            id: makeId("cashdrop"),
            waiterId,
            amount,
            expectedAmount,
            method,
            reference: reference?.trim() || undefined,
            note: note?.trim() || undefined,
            droppedAt: Date.now(),
          };
          return { cashDrops: [...s.cashDrops, drop] };
        }),

      deleteCashDrop: (dropId) =>
        set((s) => ({
          cashDrops: s.cashDrops.filter((d) => d.id !== dropId),
        })),

      addLeaveRecord: (record) =>
        set((s) => ({
          leaveRecords: [...s.leaveRecords, { ...record, id: makeId("leave") }],
        })),

      updateLeaveRecord: (leaveId, updates) =>
        set((s) => ({
          leaveRecords: s.leaveRecords.map((l) =>
            l.id === leaveId ? { ...updates, id: l.id } : l
          ),
        })),

      deleteLeaveRecord: (leaveId) =>
        set((s) => ({
          leaveRecords: s.leaveRecords.filter((l) => l.id !== leaveId),
        })),

      addIncentiveRecord: (record) =>
        set((s) => ({
          incentiveRecords: [
            ...s.incentiveRecords,
            { ...record, id: makeId("incentive") },
          ],
        })),
    }),
    {
      name: "pos-storage",
      version: 26,
      migrate: (persistedState) => {
        const state = persistedState as Partial<PosState> & {
          menu?: Array<Record<string, unknown>>;
          ingredients?: Array<Record<string, unknown>>;
          recipes?: Array<Record<string, unknown>>;
          staff?: Array<Record<string, unknown>>;
          orders?: Record<string, Record<string, unknown>>;
          tickets?: Array<Record<string, unknown>>;
          payments?: Array<Record<string, unknown>>;
          cashDrops?: Array<Record<string, unknown>>;
          leaveRecords?: Array<Record<string, unknown>>;
        };
        // Known seed items always get refreshed to the latest seed fields
        // (this is how a new imageUrl, price, etc. actually reaches a
        // browser that already has a persisted menu) — any item a manager
        // added by hand through "Add Item" isn't a seed id, so it's kept
        // untouched rather than wiped. The category taxonomy itself was
        // also fully replaced (Starters/Mains/... → Main/Extra/...), so a
        // persisted item carrying an old category string is stale leftover
        // menu data, not a genuine manager-added item — discard those too.
        const validCategories = new Set([
          "Main",
          "Extra",
          "Drinks",
          "Water",
          "Juice",
          "Packaging",
        ]);
        const seedIds = new Set(seedMenu.map((m) => m.id));
        const customMenuItems = (state.menu ?? []).filter(
          (m) =>
            !seedIds.has(m.id as string) &&
            !RETIRED_SEED_MENU_IDS.has(m.id as string) &&
            validCategories.has(m.category as string)
        );
        const hasCurrentIngredientShape = state.ingredients?.every(
          (ing) => typeof ing.totalCost === "number"
        );
        // The old demo Stock/Vendor rows were placeholders, now cleared from
        // the seed — drop them from any browser that already persisted them,
        // while keeping anything a manager genuinely added (which never
        // carries one of these retired ids).
        const ingredients = hasCurrentIngredientShape
          ? (state.ingredients as unknown as Ingredient[]).filter(
              (ing) => !RETIRED_SEED_INGREDIENT_IDS.has(ing.id)
            )
          : seedIngredients;
        const vendors = ((state.vendors ?? []) as unknown as Vendor[]).filter(
          (v) => !RETIRED_SEED_VENDOR_IDS.has(v.id)
        );
        const hasCurrentRecipeShape = state.recipes?.every(
          (r) => typeof r.menuItemId === "string"
        );
        // "Admin" only exists as a role value in the current seed (it
        // replaced "Manager"), and a real daily rate only exists once the
        // roster's actual pay data landed (an earlier reseed had everyone
        // on a placeholder monthly rate of 0) — any persisted staff list
        // missing either is stale and should be replaced, not kept.
        const hasCurrentStaffShape =
          state.staff?.some((m) => m.role === "Admin") &&
          state.staff?.some((m) => m.payType === "daily");

        // The table/session/tab model was replaced with a single flat
        // Ticket entity — a genuine breaking change, not an additive one.
        // Given how many schema iterations this app has already been
        // through in one sitting, in-progress orders from the old
        // table-based shape are not worth a bespoke converter here; if the
        // persisted orders don't already carry a ticketId, start fresh
        // from the new seed tickets rather than risk a subtly-wrong
        // conversion.
        const hasCurrentOrderShape = Object.values(state.orders ?? {}).every(
          (o) => typeof o.paymentStatus === "string" && typeof o.ticketId === "string"
        );
        const ordersAreEmpty = Object.keys(state.orders ?? {}).length === 0;

        let orders: Record<string, TicketOrder>;
        let tickets: Ticket[];
        let payments: Payment[];

        if (hasCurrentOrderShape && !ordersAreEmpty) {
          orders = state.orders as unknown as Record<string, TicketOrder>;
          tickets = ((state.tickets ?? []) as unknown as Ticket[]).length
            ? (state.tickets as unknown as Ticket[])
            : seedTickets;
          const hasCurrentPaymentShape = (state.payments ?? []).every(
            (p) => typeof p.orderId === "string" && typeof p.ticketId === "string"
          );
          payments = hasCurrentPaymentShape
            ? (state.payments as unknown as Payment[])
            : [];
        } else {
          orders = seedOrders;
          tickets = seedTickets;
          payments = [];
        }
        const ticketCounter = Math.max(
          seedTickets.length,
          ...tickets.map((t) => t.displayNumber ?? 0)
        );

        // A CashDrop recorded before `method` was added has no way to say
        // how it was settled — rather than guess, drop it. Since the
        // "Pending" figure is always re-derived from payments/drops, this
        // only resets already-forwarded cash back to pending, never loses a
        // sale.
        const hasCurrentCashDropShape = (state.cashDrops ?? []).every(
          (d) => typeof d.method === "string"
        );
        const cashDrops = hasCurrentCashDropShape
          ? (state.cashDrops as unknown as CashDrop[])
          : [];

        // Same story for a LeaveRecord saved before `isPaid` existed — drop
        // it rather than guess whether it should count as paid or unpaid.
        const hasCurrentLeaveShape = (state.leaveRecords ?? []).every(
          (l) => typeof l.isPaid === "boolean"
        );
        const leaveRecords = hasCurrentLeaveShape
          ? (state.leaveRecords as unknown as LeaveRecord[])
          : [];

        const staff = (hasCurrentStaffShape ? state.staff : seedStaff) as unknown as StaffMember[];
        // Whenever staff gets reseeded (a role rename, a new roster, etc.)
        // a persisted currentStaffId can end up pointing at an id that no
        // longer exists — that silently broke the sidebar (no staff found
        // → no name/role/logout panel, and nav quietly fell back to just
        // "/") instead of visibly sending them back to log in again.
        const currentStaffId = staff.some((m) => m.id === state.currentStaffId)
          ? state.currentStaffId
          : null;

        // Same reseed problem hits tickets: one created under an old staff
        // id (before the roster was replaced) can never resolve to a real
        // waiter again — it just shows up forever as "Unassigned" and can
        // never actually be billed by anyone. Drop it, its order, and any
        // payments recorded against it, rather than let it linger.
        const staffIds = new Set(staff.map((m) => m.id));
        const orphanedTicketIds = new Set(
          tickets.filter((t) => !staffIds.has(t.waiterId)).map((t) => t.id)
        );
        if (orphanedTicketIds.size > 0) {
          tickets = tickets.filter((t) => !orphanedTicketIds.has(t.id));
          orders = Object.fromEntries(
            Object.entries(orders).filter(([id]) => !orphanedTicketIds.has(id))
          );
          payments = payments.filter((p) => !orphanedTicketIds.has(p.ticketId));
        }

        return {
          ...state,
          menu: [...seedMenu, ...(customMenuItems as unknown as MenuItem[])],
          ingredients,
          vendors,
          recipes: hasCurrentRecipeShape ? state.recipes : seedRecipes,
          staff,
          currentStaffId,
          orders,
          tickets,
          ticketCounter,
          payments,
          cashDrops,
          leaveRecords,
          // Demo-grade PIN has no in-app way to change it yet, so always
          // trust the latest seed value rather than whatever got persisted
          // from an earlier version of this file.
          staffPin: STAFF_PIN,
        };
      },
    }
  )
);
