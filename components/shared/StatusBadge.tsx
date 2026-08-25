import type { TableStatus } from "@/lib/types";
import clsx from "clsx";

const STATUS_CONFIG: Record<TableStatus, { label: string; bg: string }> = {
  free: { label: "Free", bg: "bg-status-free" },
  occupied: { label: "Occupied", bg: "bg-status-occupied" },
  "needs-bill": { label: "Needs Bill", bg: "bg-status-needsbill" },
  reserved: { label: "Reserved", bg: "bg-status-reserved" },
};

export function StatusBadge({ status }: { status: TableStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold text-white",
        cfg.bg
      )}
    >
      {cfg.label}
    </span>
  );
}

export { STATUS_CONFIG };
