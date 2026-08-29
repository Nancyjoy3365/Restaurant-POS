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
        "rounded-2xl border bg-white flex items-center gap-2 p-2 lg:gap-3 lg:p-3 transition-shadow",
        highlighted
          ? "border-accent-400 ring-2 ring-accent-200 shadow-md"
          : "border-warm-200",
        !item.available && "opacity-50"
      )}
    >
      <button
        type="button"
        disabled={!item.available}
        onClick={() => onAdd({ spiceLevel, addOns })}
        aria-label={`Add ${item.name}`}
        className="relative shrink-0 w-20 lg:w-36 aspect-square rounded-xl overflow-hidden hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:hover:opacity-100 transition"
      >
        <FoodImage
          imageUrl={item.imageUrl}
          category={item.category}
          name={item.name}
          className="h-full w-full"
          emojiClassName="text-xl lg:text-3xl"
        />
        <span
          className={clsx(
            "absolute top-1.5 left-1.5 inline-block h-3.5 w-3.5 rounded-md border-2 bg-white/90",
            item.veg ? "border-emerald-600" : "border-rose-600"
          )}
          aria-hidden
        />
      </button>

      <div className="min-w-0 flex-1 flex flex-col gap-1.5 lg:gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold text-sm lg:text-lg text-slate-900 leading-tight">
            {item.name}
          </h3>
          <span className="text-sm lg:text-lg font-black text-accent-700 whitespace-nowrap">
            {formatKES(item.price)}
          </span>
        </div>
        {item.comboTag && (
          <span className="inline-block -mt-1.5 self-start rounded-full bg-accent-600 text-white text-[10px] font-extrabold px-2.5 py-1 uppercase tracking-wide">
            {item.comboTag}
          </span>
        )}

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
          className="mt-auto flex items-center justify-center gap-1.5 lg:gap-2 rounded-full border-2 border-accent-600 text-accent-700 hover:bg-accent-600 hover:text-white active:bg-accent-700 disabled:border-slate-200 disabled:text-slate-300 text-sm lg:text-base font-extrabold py-2 lg:py-3.5 transition-colors"
        >
          <Plus size={16} strokeWidth={3} />
          {item.available ? "Add" : "Unavailable"}
        </button>
      </div>
    </div>
  );
}
