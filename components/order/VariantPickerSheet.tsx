"use client";

import { X } from "lucide-react";
import type { MenuItem } from "@/lib/types";
import { formatKES } from "@/lib/utils";

export function VariantPickerSheet({
  groupName,
  variants,
  onSelect,
  onClose,
}: {
  groupName: string;
  variants: MenuItem[];
  onSelect: (item: MenuItem) => void;
  onClose: () => void;
}) {
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
          <h3 className="font-extrabold text-slate-900">{groupName}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
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
                onClick={() => onSelect(v)}
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
      </div>
    </div>
  );
}
