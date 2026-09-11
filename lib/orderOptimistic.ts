import { unbilledOrderTotal, makeId } from "@/lib/utils";
import type { AddOn, MenuItem, OrderLineItem, Round, TicketOrder } from "@/lib/types";

// Pure, client-side mirrors of the mutation bodies that used to live in
// lib/store.ts's Zustand reducers — reused here so the cart can show the
// result of a tap instantly (via SWR optimisticData) while the real write
// happens on the server. The server is always the source of truth: these
// are overwritten the moment its response lands (see lib/hooks/useOrders.ts).

function withRefreshedBillTotals(order: TicketOrder, vatRate: number): TicketOrder {
  if (!order.billTotals) return order;
  return { ...order, billTotals: unbilledOrderTotal(order, vatRate) };
}

export function optimisticAddItem(
  order: TicketOrder,
  roundId: string,
  menuItem: MenuItem,
  opts: { spiceLevel?: string; addOns?: AddOn[] },
  vatRate: number
): TicketOrder {
  const addOns = opts.addOns ?? [];
  const addOnKey = addOns
    .map((a) => a.name)
    .sort()
    .join("|");
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
          i.addOns
            .map((a) => a.name)
            .sort()
            .join("|") === addOnKey
      );
      if (existing) {
        return {
          ...r,
          items: r.items.map((i) => (i.id === existing.id ? { ...i, qty: i.qty + 1 } : i)),
        };
      }
      return { ...r, items: [...r.items, makeLine()] };
    });
  }

  const paymentStatus = order.paymentStatus === "paid" ? "unpaid" : order.paymentStatus;
  return withRefreshedBillTotals({ ...order, rounds, paymentStatus }, vatRate);
}

export function optimisticUpdateItemQty(order: TicketOrder, itemId: string, qty: number, vatRate: number): TicketOrder {
  const rounds = order.rounds.map((r) => ({
    ...r,
    items:
      qty <= 0
        ? r.items.filter((i) => i.id !== itemId)
        : r.items.map((i) => (i.id === itemId ? { ...i, qty } : i)),
  }));
  return withRefreshedBillTotals({ ...order, rounds }, vatRate);
}

export function optimisticRemoveItem(order: TicketOrder, itemId: string, vatRate: number): TicketOrder {
  const rounds = order.rounds.map((r) => ({ ...r, items: r.items.filter((i) => i.id !== itemId) }));
  return withRefreshedBillTotals({ ...order, rounds }, vatRate);
}
