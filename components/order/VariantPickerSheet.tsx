"use client";

import { useState } from "react";
import clsx from "clsx";
import { X, Flame, ArrowLeft } from "lucide-react";
import type { AddOn, MenuItem } from "@/lib/types";
import { formatKES } from "@/lib/utils";

export function VariantPickerSheet({
  groupName,
  variants,
  onSelect,
  onClose,
}: {
  groupName: string;
  variants: MenuItem[];
  onSelect: (
    item: MenuItem,
    opts: { spiceLevel?: string; addOns?: AddOn[] }
  ) => void;
  onClose: () => void;
}) {
  // A variant with its own spiceLevels (e.g. every Fish preparation) gets a
  // second step here to pick one before adding — variants with none skip
  // straight to adding, same as today.
  const [pendingVariant, setPendingVariant] = useState<MenuItem | null>(null);
  const [spiceLevel, setSpiceLevel] = useState<string | undefined>(undefined);

  function chooseVariant(item: MenuItem) {
    if (item.spiceLevels && item.spiceLevels.length > 0) {
      setPendingVariant(item);
      setSpiceLevel(item.spiceLevels[0]);
    } else {
      onSelect(item, {});
    }
  }

  function confirmPending() {
    if (!pendingVariant) return;
    onSelect(pendingVariant, { spiceLevel });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-white p-5 pb-8 sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-extrabold text-slate-900">
            {pendingVariant
              ? `${groupName} (${pendingVariant.variantLabel ?? pendingVariant.name})`
              : groupName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {!pendingVariant ? (
          <>
            <p className="text-xs text-slate-500 font-semibold mb-4">
              Choose a variant to add.
            </p>
            <div className="space-y-2">
              {variants.length === 0 ? (
                <p className="text-sm text-slate-400 font-semibold text-center py-4">
                  No variants currently available.
                </p>
              ) : (
                variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => chooseVariant(v)}
                    className="w-full flex items-center justify-between gap-3 rounded-xl border border-warm-200 hover:border-accent-400 hover:bg-accent-50 text-left px-4 py-3 transition-colors"
                  >
                    <span className="font-bold text-slate-800">
                      {v.variantLabel ?? v.name}
                    </span>
                    <span className="font-extrabold text-accent-700 whitespace-nowrap">
                      {formatKES(v.price)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-500 font-semibold mb-3">
              Choose a spice level.
            </p>
            <div className="flex items-center gap-1.5 flex-wrap mb-5">
              <Flame size={14} className="text-orange-500 shrink-0" />
              {pendingVariant.spiceLevels!.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSpiceLevel(level)}
                  className={clsx(
                    "rounded-full px-3 py-1.5 text-xs font-bold border transition-colors",
                    spiceLevel === level
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "border-warm-200 text-slate-600 hover:border-orange-300"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingVariant(null)}
                className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-warm-200 text-slate-500 hover:border-slate-300 font-extrabold px-4 py-3 transition-colors"
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                type="button"
                onClick={confirmPending}
                className="flex-1 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-extrabold py-3 transition-colors"
              >
                Add · {formatKES(pendingVariant.price)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
