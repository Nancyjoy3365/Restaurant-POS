"use client";

import { useState } from "react";
import clsx from "clsx";
import { Plus, Flame } from "lucide-react";
import type { AddOn, MenuItem } from "@/lib/types";
import { formatKES } from "@/lib/utils";
import { FoodImage } from "@/components/shared/FoodImage";

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
        "rounded-2xl border bg-white flex flex-col gap-2.5 overflow-hidden transition-shadow",
        highlighted
          ? "border-accent-400 ring-2 ring-accent-200 shadow-md"
          : "border-warm-200",
        !item.available && "opacity-50"
      )}
    >
      <div className="relative">
        <FoodImage
          imageUrl={item.imageUrl}
          category={item.category}
          name={item.name}
          className="w-full aspect-[4/3]"
          emojiClassName="text-5xl"
        />
        <span
          className={clsx(
            "absolute top-2.5 left-2.5 inline-block h-4 w-4 rounded-md border-2 bg-white/90",
            item.veg ? "border-emerald-600" : "border-rose-600"
          )}
          aria-hidden
        />
        {item.comboTag && (
          <span className="absolute top-2.5 right-2.5 inline-block rounded-full bg-accent-600 text-white text-[10px] font-extrabold px-2.5 py-1 uppercase tracking-wide shadow-sm">
            {item.comboTag}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5 px-4 pb-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold text-base text-slate-900 leading-tight">
            {item.name}
          </h3>
          <span className="text-base font-black text-accent-700 whitespace-nowrap">
            {formatKES(item.price)}
          </span>
        </div>

        {item.spiceLevels && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Flame size={14} className="text-orange-500" />
            {item.spiceLevels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSpiceLevel(level)}
                className={clsx(
                  "rounded-full px-2.5 py-1 text-xs font-bold border",
                  spiceLevel === level
                    ? "bg-orange-500 border-orange-500 text-white"
                    : "border-warm-200 text-slate-600 hover:border-orange-300"
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
                    "rounded-full px-2.5 py-1 text-xs font-bold border",
                    selected
                      ? "bg-accent-600 border-accent-600 text-white"
                      : "border-warm-200 text-slate-600 hover:border-accent-300"
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
          className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white text-base font-extrabold py-3 transition-colors"
        >
          <Plus size={18} strokeWidth={3} />
          {item.available ? "Add" : "Unavailable"}
        </button>
      </div>
    </div>
  );
}
