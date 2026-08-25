"use client";

import clsx from "clsx";
import { Minus, Plus, AlertTriangle } from "lucide-react";
import type { TableOrder } from "@/lib/types";
import { usePosStore } from "@/lib/store";
import {
  flattenOrderItems,
  lineRawTotal,
  computeEqualSplit,
  computeItemSplit,
  formatKES,
} from "@/lib/utils";

export type SplitMode = "none" | "equal" | "item";

export function SplitPanel({
  tableId,
  order,
  total,
  mode,
  onModeChange,
}: {
  tableId: string;
  order: TableOrder | undefined;
  total: number;
  mode: SplitMode;
  onModeChange: (m: SplitMode) => void;
}) {
  const guestCount = order?.guestCount ?? 1;
  const setGuestCount = usePosStore((s) => s.setGuestCount);
  const toggleItemGuest = usePosStore((s) => s.toggleItemGuest);
  const lines = flattenOrderItems(order);

  const equalAmounts = computeEqualSplit(total, guestCount);
  const { guestTotals, unassigned } = computeItemSplit(order, guestCount);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-extrabold text-slate-900">Split Bill</h2>
        <div className="flex rounded-full border border-slate-200 p-0.5">
          {(["none", "equal", "item"] as SplitMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-extrabold transition-colors",
                mode === m
                  ? "bg-accent-600 text-white"
                  : "text-slate-500 hover:text-accent-700"
              )}
            >
              {m === "none" ? "None" : m === "equal" ? "Equal" : "By Item"}
            </button>
          ))}
        </div>
      </div>

      {mode === "none" && (
        <p className="text-sm text-slate-400 font-semibold">
          One bill, one guest. Switch to Equal or By Item to split.
        </p>
      )}

      {mode !== "none" && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-bold text-slate-600">Guests</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGuestCount(tableId, guestCount - 1)}
              className="h-7 w-7 flex items-center justify-center rounded-full border border-slate-200 hover:border-accent-300"
            >
              <Minus size={13} />
            </button>
            <span className="font-black w-5 text-center">{guestCount}</span>
            <button
              type="button"
              onClick={() => setGuestCount(tableId, guestCount + 1)}
              className="h-7 w-7 flex items-center justify-center rounded-full border border-slate-200 hover:border-accent-300"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
      )}

      {mode === "equal" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {equalAmounts.map((amt, i) => (
            <div
              key={i}
              className="rounded-lg bg-accent-50 border border-accent-100 px-3 py-2 text-center"
            >
              <div className="text-xs font-extrabold text-accent-700">
                G{i + 1}
              </div>
              <div className="font-black text-slate-900">{formatKES(amt)}</div>
            </div>
          ))}
        </div>
      )}

      {mode === "item" && (
        <div className="space-y-3">
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {lines.map(({ item }) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate">
                    {item.qty}× {item.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-semibold">
                    {formatKES(lineRawTotal(item))}
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {Array.from({ length: guestCount }, (_, i) => `G${i + 1}`).map(
                    (g) => {
                      const active = item.assignedGuests.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleItemGuest(tableId, item.id, g)}
                          className={clsx(
                            "h-6 min-w-6 px-1.5 rounded-full text-[11px] font-extrabold border",
                            active
                              ? "bg-accent-600 border-accent-600 text-white"
                              : "border-slate-200 text-slate-500 hover:border-accent-300"
                          )}
                        >
                          {g}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            ))}
          </div>

          {unassigned > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800 text-xs font-extrabold">
              <AlertTriangle size={14} />
              Unassigned: {formatKES(unassigned)}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {guestTotals.map(({ guestId, amount }) => (
              <div
                key={guestId}
                className="rounded-lg bg-accent-50 border border-accent-100 px-3 py-2 text-center"
              >
                <div className="text-xs font-extrabold text-accent-700">
                  {guestId}
                </div>
                <div className="font-black text-slate-900">
                  {formatKES(amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
