import type { TableOrder } from "./types";

export const VAT_RATE = 0.16;

export function flattenOrderItems(order: TableOrder | undefined) {
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

export interface GuestSplitResult {
  guestTotals: { guestId: string; amount: number }[];
  unassigned: number;
}

export function computeEqualSplit(total: number, guestCount: number): number[] {
  const n = Math.max(1, guestCount);
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function computeItemSplit(
  order: TableOrder | undefined,
  guestCount: number
): GuestSplitResult {
  const lines = flattenOrderItems(order);
  const guestRaw: Record<string, number> = {};
  for (let i = 1; i <= guestCount; i++) guestRaw[`G${i}`] = 0;
  let unassignedRaw = 0;

  for (const { item } of lines) {
    const raw = lineRawTotal(item);
    const assigned = item.assignedGuests.filter(
      (g) => guestRaw[g] !== undefined
    );
    if (assigned.length === 0) {
      unassignedRaw += raw;
    } else {
      const share = raw / assigned.length;
      for (const g of assigned) guestRaw[g] += share;
    }
  }

  const guestTotals = Object.entries(guestRaw).map(([guestId, raw]) => ({
    guestId,
    amount: Math.round(raw * (1 + VAT_RATE)),
  }));
  const unassigned = Math.round(unassignedRaw * (1 + VAT_RATE));

  return { guestTotals, unassigned };
}

export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function calcBill(subtotalBeforeTax: number) {
  const subtotal = Math.round(subtotalBeforeTax);
  const vat = Math.round(subtotal * VAT_RATE);
  const total = subtotal + vat;
  return { subtotal, vat, total };
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function tableLabel(table: { number: number; customName?: string }): string {
  return table.customName ? `T${table.number} · ${table.customName}` : `Table ${table.number}`;
}

let idCounter = 0;
export function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}
