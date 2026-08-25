"use client";

import { useState } from "react";
import clsx from "clsx";
import { Plus, Flame } from "lucide-react";
import type { AddOn, MenuItem } from "@/lib/types";
import { formatKES } from "@/lib/utils";

export function MenuCard({
  item,
  highlighted,
  onAdd,
}: {
  item: MenuItem;
  highlighted?: boolean;
  onAdd: (opts: { spiceLevel?: string; addOns?: AddOn[] }) => void;
}) {
  const [spiceLevel, setSpiceLevel] = useState<string | undefined>(
    item.spiceLevels?.[0]
  );
  const [addOns, setAddOns] = useState<AddOn[]>([]);

  function toggleAddOn(addOn: AddOn) {
    setAddOns((prev) =>
      prev.some((a) => a.name === addOn.name)
        ? prev.filter((a) => a.name !== addOn.name)
        : [...prev, addOn]
    );
  }

  return (
    <div
      id={`menu-item-${item.id}`}
      className={clsx(
        "rounded-xl border bg-white p-3.5 flex flex-col gap-2 transition-shadow",
        highlighted
          ? "border-accent-400 ring-2 ring-accent-200 shadow-md"
          : "border-slate-200",
        !item.available && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={clsx(
                "inline-block h-2.5 w-2.5 rounded-sm border-2 shrink-0",
                item.veg ? "border-emerald-600" : "border-rose-600"
              )}
              aria-hidden
            />
            <h3 className="font-extrabold text-sm text-slate-900 truncate">
              {item.name}
            </h3>
          </div>
          {item.comboTag && (
            <span className="mt-1 inline-block rounded-full bg-accent-100 text-accent-700 text-[10px] font-extrabold px-2 py-0.5 uppercase tracking-wide">
              {item.comboTag}
            </span>
          )}
        </div>
        <span className="text-sm font-black text-slate-900 whitespace-nowrap">
          {formatKES(item.price)}
        </span>
      </div>

      {item.spiceLevels && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Flame size={13} className="text-orange-500" />
          {item.spiceLevels.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setSpiceLevel(level)}
              className={clsx(
                "rounded-full px-2 py-0.5 text-[11px] font-bold border",
                spiceLevel === level
                  ? "bg-orange-500 border-orange-500 text-white"
                  : "border-slate-200 text-slate-600 hover:border-orange-300"
              )}
            >
              {level}
            </button>
          ))}
        </div>
      )}

      {item.addOns && item.addOns.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.addOns.map((addOn) => {
            const selected = addOns.some((a) => a.name === addOn.name);
            return (
              <button
                key={addOn.name}
                type="button"
                onClick={() => toggleAddOn(addOn)}
                className={clsx(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold border",
                  selected
                    ? "bg-accent-600 border-accent-600 text-white"
                    : "border-slate-200 text-slate-600 hover:border-accent-300"
                )}
              >
                {addOn.name}
                {addOn.price > 0 ? ` +${formatKES(addOn.price)}` : ""}
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        disabled={!item.available}
        onClick={() => onAdd({ spiceLevel, addOns })}
        className="mt-auto flex items-center justify-center gap-1.5 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white text-sm font-extrabold py-2 transition-colors"
      >
        <Plus size={15} strokeWidth={3} />
        {item.available ? "Add" : "Unavailable"}
      </button>
    </div>
  );
}
