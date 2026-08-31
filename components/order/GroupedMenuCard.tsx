"use client";

import { useState } from "react";
import clsx from "clsx";
import { Plus } from "lucide-react";
import type { MenuItem } from "@/lib/types";
import { formatKES } from "@/lib/utils";
import { FoodImage } from "@/components/shared/FoodImage";
import { VariantPickerSheet } from "./VariantPickerSheet";

export function GroupedMenuCard({
  groupName,
  variants,
  onSelect,
}: {
  groupName: string;
  variants: MenuItem[];
  onSelect: (item: MenuItem) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const availableVariants = variants.filter((v) => v.available);
  const hasAvailable = availableVariants.length > 0;
  const lowestPrice = Math.min(...variants.map((v) => v.price));
  const representative = variants[0];

  function openPicker() {
    if (hasAvailable) setPickerOpen(true);
  }

  return (
    <>
      <div
        className={clsx(
          "rounded-2xl border bg-white flex items-center gap-2 p-2 lg:gap-3 lg:p-3 transition-shadow border-warm-200",
          !hasAvailable && "opacity-50"
        )}
      >
        <button
          type="button"
          disabled={!hasAvailable}
          onClick={openPicker}
          aria-label={`Choose ${groupName} variant`}
          className="relative shrink-0 w-20 lg:w-36 aspect-square rounded-xl overflow-hidden hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:hover:opacity-100 transition"
        >
          <FoodImage
            imageUrl={representative.imageUrl}
            category={representative.category}
            name={groupName}
            className="h-full w-full"
            emojiClassName="text-xl lg:text-3xl"
          />
        </button>

        <div className="min-w-0 flex-1 flex flex-col gap-1.5 lg:gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-extrabold text-sm lg:text-lg text-slate-900 leading-tight">
              {groupName}
            </h3>
            <span className="text-sm lg:text-lg font-black text-accent-700 whitespace-nowrap">
              From {formatKES(lowestPrice)}
            </span>
          </div>

          <button
            type="button"
            disabled={!hasAvailable}
            onClick={openPicker}
            className="mt-auto flex items-center justify-center gap-1.5 lg:gap-2 rounded-full border-2 border-accent-600 text-accent-700 hover:bg-accent-600 hover:text-white active:bg-accent-700 disabled:border-slate-200 disabled:text-slate-300 text-sm lg:text-base font-extrabold py-2 lg:py-3.5 transition-colors"
          >
            <Plus size={16} strokeWidth={3} />
            {hasAvailable ? "Choose" : "Unavailable"}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <VariantPickerSheet
          groupName={groupName}
          variants={availableVariants}
          onSelect={(item) => {
            onSelect(item);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}
