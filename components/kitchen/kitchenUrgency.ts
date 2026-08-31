export type KitchenUrgency = "new" | "on-time" | "late";

export const KITCHEN_URGENCY_CONFIG: Record<
  KitchenUrgency,
  { label: string; dot: string; border: string; badge: string }
> = {
  new: {
    label: "New",
    dot: "bg-amber-500",
    border: "border-t-amber-500",
    badge: "bg-amber-50 text-amber-700",
  },
  "on-time": {
    label: "On time",
    dot: "bg-status-free",
    border: "border-t-status-free",
    badge: "bg-emerald-50 text-emerald-700",
  },
  late: {
    label: "Running late",
    dot: "bg-rose-500",
    border: "border-t-rose-500",
    badge: "bg-rose-50 text-rose-700",
  },
};

export const KITCHEN_URGENCY_LEGEND: KitchenUrgency[] = [
  "new",
  "on-time",
  "late",
];

const NEW_THRESHOLD_MS = 2 * 60 * 1000;
const LATE_THRESHOLD_MS = 10 * 60 * 1000;

export function urgencyFor(elapsedMs: number): KitchenUrgency {
  if (elapsedMs < NEW_THRESHOLD_MS) return "new";
  if (elapsedMs < LATE_THRESHOLD_MS) return "on-time";
  return "late";
}

export function elapsedLabel(elapsedMs: number): string {
  const minutes = Math.floor(elapsedMs / 60000);
  if (minutes < 1) return "Just in";
  return `${minutes} min`;
}
