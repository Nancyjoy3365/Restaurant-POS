"use client";

import clsx from "clsx";
import { Soup, UtensilsCrossed, Flame, CupSoda, IceCreamCone } from "lucide-react";
import type { MenuCategory } from "@/lib/types";

const CATEGORIES: { name: MenuCategory; icon: typeof Soup }[] = [
  { name: "Starters", icon: Soup },
  { name: "Mains", icon: UtensilsCrossed },
  { name: "Grills", icon: Flame },
  { name: "Beverages", icon: CupSoda },
  { name: "Desserts", icon: IceCreamCone },
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
      {CATEGORIES.map(({ name, icon: Icon }) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          className={clsx(
            "shrink-0 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold transition-colors",
            active === name
              ? "bg-accent-600 text-white shadow-sm"
              : "bg-warm-50 text-slate-600 border border-warm-200 hover:border-accent-300"
          )}
        >
          <Icon size={17} strokeWidth={2.5} />
          {name}
        </button>
      ))}
    </div>
  );
}

export { CATEGORIES };
