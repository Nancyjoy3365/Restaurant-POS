import { CheckCircle2, type LucideIcon } from "lucide-react";
import type { OrderType, Ticket, TicketOrder } from "@/lib/types";

export type TicketDisplayStatus = "in-progress" | "ready" | "needs-bill" | "held";

export const TICKET_STATUS_CONFIG: Record<
  TicketDisplayStatus,
  { label: string; chip: string; dot: string; icon?: LucideIcon }
> = {
  "in-progress": {
    label: "In Progress",
    chip: "bg-sky-50 text-sky-700",
    dot: "bg-status-occupied",
  },
  ready: {
    label: "Order Ready",
    chip: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  "needs-bill": {
    label: "Needs Bill",
    chip: "bg-amber-50 text-amber-700",
    dot: "bg-status-needsbill",
  },
  held: {
    label: "Held",
    chip: "bg-indigo-50 text-indigo-700",
    dot: "bg-indigo-500",
  },
};

export const TICKET_VIEW_LEGEND: TicketDisplayStatus[] = [
  "in-progress",
  "ready",
  "needs-bill",
  "held",
];

function isOrderReady(order: TicketOrder): boolean {
  const items = order.rounds.flatMap((r) => r.items);
  const sentItems = items.filter((i) => i.sentToKitchen);
  return sentItems.length > 0 && sentItems.every((i) => i.kitchenReady);
}

export function ticketDisplayStatus(order: TicketOrder | undefined): TicketDisplayStatus {
  if (order?.onHold) return "held";
  if (order?.billTotals) return "needs-bill";
  if (order && isOrderReady(order)) return "ready";
  return "in-progress";
}

// Tickets created before `orderType` existed have no value stored — treat
// that as "dine_in" everywhere rather than requiring a data migration.
export function ticketOrderType(ticket: Ticket): OrderType {
  return ticket.orderType ?? "dine_in";
}

// Compact subtitle for list/table rows: a takeaway ticket has no table to
// reference, so its customer name takes the place of the dine-in
// `locationNote` breadcrumb.
export function ticketSubtitle(ticket: Ticket): string | undefined {
  if (ticketOrderType(ticket) === "takeaway") {
    return ticket.customerName || "Takeaway";
  }
  return ticket.locationNote;
}

// Same idea, but for single-ticket detail headers where there's room to
// also surface the phone number a waiter might need to call.
export function ticketDetailSubtitle(ticket: Ticket): string | undefined {
  if (ticketOrderType(ticket) === "takeaway") {
    const name = ticket.customerName || "Takeaway";
    return ticket.customerPhone ? `${name} · ${ticket.customerPhone}` : name;
  }
  return ticket.locationNote;
}

const AVATAR_COLORS = [
  "bg-accent-600",
  "bg-sky-600",
  "bg-emerald-600",
  "bg-indigo-600",
  "bg-rose-600",
];

export function avatarColorFor(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
