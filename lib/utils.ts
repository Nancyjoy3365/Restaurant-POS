import type { TicketOrder } from "./types";

export const VAT_RATE = 0.16;

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

let idCounter = 0;
export function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}
