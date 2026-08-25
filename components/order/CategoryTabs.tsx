"use client";

import clsx from "clsx";
import type { MenuCategory } from "@/lib/types";

const CATEGORIES: MenuCategory[] = [
  "Starters",
  "Mains",
  "Grills",
  "Beverages",
  "Desserts",
];

export function CategoryTabs({
  active,
  onChange,
}: {
  active: MenuCategory;
  onChange: (c: MenuCategory) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat)}
          className={clsx(
            "shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition-colors",
            active === cat
              ? "bg-accent-600 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:border-accent-300"
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

export { CATEGORIES };
