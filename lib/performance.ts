import type { MenuItem, Receipt, Ticket } from "./types";
import { isToday } from "./reports";

export function ordersCompletedToday(
  tickets: Ticket[],
  waiterId: string,
  now = new Date()
): number {
  return tickets.filter(
    (t) =>
      t.waiterId === waiterId &&
      t.status === "paid" &&
      t.closedAt !== undefined &&
      isToday(t.closedAt, now)
  ).length;
}

export interface PriorityProductTally {
  name: string;
  qty: number;
}

// Tallied from receipts (not live cart items), so only genuinely completed,
// paid sales count — nothing still sitting in an open cart, and nothing
// later voided, since a receipt is only ever generated at full settlement.
export function priorityUnitsSoldToday(
  receipts: Receipt[],
  tickets: Ticket[],
  menu: MenuItem[],
  waiterId: string,
  now = new Date()
): PriorityProductTally[] {
  const priorityMenuItemIds = new Set(
    menu.filter((m) => m.isPriority).map((m) => m.id)
  );
  if (priorityMenuItemIds.size === 0) return [];

  const ticketById = new Map(tickets.map((t) => [t.id, t]));
  const tallyByName = new Map<string, number>();

  for (const receipt of receipts) {
    if (!isToday(receipt.issuedAt, now)) continue;
    const ticket = ticketById.get(receipt.ticketId);
    if (!ticket || ticket.waiterId !== waiterId) continue;
    for (const line of receipt.items) {
      if (!priorityMenuItemIds.has(line.menuItemId)) continue;
      tallyByName.set(line.name, (tallyByName.get(line.name) ?? 0) + line.qty);
    }
  }

  return Array.from(tallyByName, ([name, qty]) => ({ name, qty }));
}
