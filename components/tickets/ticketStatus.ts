import type { TicketOrder } from "@/lib/types";

export type TicketDisplayStatus = "in-progress" | "needs-bill" | "held";

export const TICKET_STATUS_CONFIG: Record<
  TicketDisplayStatus,
  { label: string; chip: string; dot: string }
> = {
  "in-progress": {
    label: "In Progress",
    chip: "bg-sky-50 text-sky-700",
    dot: "bg-status-occupied",
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
  "needs-bill",
  "held",
];

export function ticketDisplayStatus(order: TicketOrder | undefined): TicketDisplayStatus {
  if (order?.onHold) return "held";
  if (order?.billTotals) return "needs-bill";
  return "in-progress";
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
