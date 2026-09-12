import type { Payment, TicketOrder } from "./types";

// Fallback only — the real, editable rate lives in RestaurantSettings
// (Settings page, fetched via lib/hooks/useRestaurantSettings.ts). This is
// used solely as a default when a caller doesn't have that rate on hand.
export const VAT_RATE = 0.16;

// Forces a leading capital regardless of how the user typed it — the rest of
// the string is left untouched (no full title-casing).
export function capitalizeFirst(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

export function flattenOrderItems(order: TicketOrder | undefined) {
  if (!order) return [];
  return order.rounds.flatMap((round) =>
    round.items.map((item) => ({ item, roundIndex: round.index }))
  );
}

export function lineRawTotal(item: {
  price: number;
  qty: number;
  addOns: { price: number }[];
}): number {
  const addOnTotal = item.addOns.reduce((s, a) => s + a.price, 0);
  return (item.price + addOnTotal) * item.qty;
}

export function getOrderTotal(order: TicketOrder | undefined, vatRate: number = VAT_RATE) {
  const lines = flattenOrderItems(order);
  const raw = lines.reduce((sum, { item }) => sum + lineRawTotal(item), 0);
  return calcBill(raw, vatRate);
}

// Rounds already covered by a finalized receipt are a closed, fiscally
// signed cycle — they must never be re-billed or have their total change.
// Anything ordered afterward (a new round, or more items) belongs to the
// next cycle and gets its own bill/receipt/invoice number.
export function currentCycleNumber(order: TicketOrder | undefined): number {
  return (order?.billedThroughRoundIndex ?? 0) + 1;
}

export function unbilledOrderTotal(order: TicketOrder, vatRate: number = VAT_RATE) {
  const billedThrough = order.billedThroughRoundIndex ?? 0;
  const unbilledRounds = order.rounds.filter((r) => r.index > billedThrough);
  return getOrderTotal({ ...order, rounds: unbilledRounds }, vatRate);
}

export function cyclePaidAmount(payments: Payment[], order: TicketOrder | undefined): number {
  if (!order) return 0;
  const cycleNumber = currentCycleNumber(order);
  return payments
    .filter((p) => p.orderId === order.id && (p.billingCycle ?? 1) === cycleNumber)
    .reduce((sum, p) => sum + p.amount, 0);
}

// Same as cyclePaidAmount, but an M-Pesa payment with no confirmation code
// doesn't count — it hasn't actually been verified yet, so it must never be
// enough on its own to mark an order "paid" (that would skip the cashier's
// verification step and silently drop it out of the Awaiting Payment
// queue). Cash is always physically in hand, so it never needs a code.
export function verifiedCyclePaidAmount(payments: Payment[], order: TicketOrder | undefined): number {
  if (!order) return 0;
  const cycleNumber = currentCycleNumber(order);
  return payments
    .filter(
      (p) =>
        p.orderId === order.id &&
        (p.billingCycle ?? 1) === cycleNumber &&
        (p.method !== "mpesa" || Boolean(p.reference && p.reference.trim()))
    )
    .reduce((sum, p) => sum + p.amount, 0);
}

export function paymentsForCurrentCycle(payments: Payment[], order: TicketOrder | undefined): Payment[] {
  if (!order) return [];
  const cycleNumber = currentCycleNumber(order);
  return payments.filter(
    (p) => p.orderId === order.id && (p.billingCycle ?? 1) === cycleNumber
  );
}

export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// Menu prices are VAT-inclusive — `rawTotal` (the sum of listed prices) is
// what the customer actually pays; VAT is backed out of it for the printed
// breakdown/reporting, never added on top. Mirrors usp_StartBilling /
// usp_RefreshOrderDetailTotals (database/08_vat_inclusive_pricing.sql).
export function calcBill(rawTotal: number, vatRate: number = VAT_RATE) {
  const total = Math.round(rawTotal);
  const subtotal = Math.round(total / (1 + vatRate));
  const vat = total - subtotal;
  return { subtotal, vat, total };
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

let idCounter = 0;
export function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

// Local (not UTC) calendar-day key, so a leave range like "2026-09-05" means
// the same day everywhere it's compared, regardless of time-of-day.
export function toDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0 && m === 0) return "0h";
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
