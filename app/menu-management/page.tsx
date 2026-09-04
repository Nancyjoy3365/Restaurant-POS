"use client";

import { useState } from "react";
import clsx from "clsx";
import { Pencil, Plus, Search, X } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { Toggle } from "@/components/shared/Toggle";
import { FoodImage } from "@/components/shared/FoodImage";
import { AddMenuItemModal } from "@/components/menu-management/AddMenuItemModal";
import { formatKES } from "@/lib/utils";
import type { MenuCategory, MenuItem } from "@/lib/types";

const CATEGORY_ORDER: MenuCategory[] = [
  "Main",
  "Extra",
  "Drinks",
  "Water",
  "Juice",
  "Packaging",
];

type CategoryFilter = "All" | MenuCategory;
type AvailabilityFilter = "All" | "Active" | "Disabled";

export default function MenuManagementPage() {
  const rawMenu = usePosStore((s) => s.menu);
  const sortedMenu = [...rawMenu].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
  );
  const toggleMenuAvailability = usePosStore((s) => s.toggleMenuAvailability);
  const toggleMenuPriority = usePosStore((s) => s.toggleMenuPriority);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("All");

  const query = search.trim().toLowerCase();
  const menu = sortedMenu.filter((item) => {
    if (categoryFilter !== "All" && item.category !== categoryFilter) return false;
    if (availabilityFilter === "Active" && !item.available) return false;
    if (availabilityFilter === "Disabled" && item.available) return false;
    if (query && !item.name.toLowerCase().includes(query)) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col lg:h-full lg:overflow-hidden">
      <header className="shrink-0 h-16 flex items-center justify-between px-6 border-b border-warm-200 bg-white">
        <h1 className="text-xl font-black text-slate-900">Menu Management</h1>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-extrabold px-5 py-3 transition-colors"
        >
          <Plus size={18} strokeWidth={3} /> Add Item
        </button>
      </header>

      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-warm-200 bg-white">
        <div className="flex gap-2 overflow-x-auto">
          {(["All", ...CATEGORY_ORDER] as CategoryFilter[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter(c)}
              className={clsx(
                "shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition-colors",
                categoryFilter === c
                  ? "bg-accent-600 text-white"
                  : "bg-warm-50 text-slate-600 border border-warm-200 hover:border-accent-300"
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-warm-200 p-0.5">
            {(["All", "Active", "Disabled"] as AvailabilityFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setAvailabilityFilter(f)}
                className={clsx(
                  "rounded-full px-3 py-1.5 text-xs font-extrabold transition-colors",
                  availabilityFilter === f
                    ? "bg-accent-600 text-white"
                    : "text-slate-500 hover:text-accent-700"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu items"
              className="w-full rounded-full border border-warm-200 bg-white pl-8 pr-8 py-2 text-sm font-semibold outline-none focus:border-accent-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 lg:min-h-0 overflow-y-auto p-6">
        <div className="rounded-2xl border border-warm-200 bg-white overflow-hidden">
          {menu.length === 0 ? (
            <p className="text-slate-400 font-semibold text-center py-12">
              No menu items match your filters.
            </p>
          ) : (
          <table className="w-full text-sm">
            <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
              <tr>
                <th className="text-left px-2 py-3"></th>
                <th className="text-left px-2 py-3">Item</th>
                <th className="text-left px-2 py-3">Category</th>
                <th className="text-right px-2 py-3">Price</th>
                <th className="text-center px-2 py-3">Priority</th>
                <th className="text-center px-4 py-3">Available</th>
                <th className="text-center px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {menu.map((item) => {
                return (
                  <tr
                    key={item.id}
                    className={clsx(
                      "border-t border-warm-100",
                      !item.available && "opacity-50"
                    )}
                  >
                    <td className="px-2 py-2">
                      <FoodImage
                        imageUrl={item.imageUrl}
                        category={item.category}
                        name={item.name}
                        className="h-10 w-10 rounded-lg"
                        emojiClassName="text-lg"
                      />
                    </td>
                    <td className="px-2 py-3 font-bold text-slate-900">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={clsx(
                            "inline-block h-2.5 w-2.5 rounded-sm border-2",
                            item.veg ? "border-emerald-600" : "border-rose-600"
                          )}
                        />
                        {item.name}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-slate-600 font-semibold">
                      {item.category}
                    </td>
                    <td className="px-2 py-3 text-right font-bold text-slate-900">
                      {formatKES(item.price)}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-center">
                        <Toggle
                          checked={item.isPriority ?? false}
                          onChange={() => toggleMenuPriority(item.id)}
                          label={`Toggle priority product for ${item.name}`}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <Toggle
                          checked={item.available}
                          onChange={() => toggleMenuAvailability(item.id)}
                          label={`Toggle availability for ${item.name}`}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          aria-label={`Edit ${item.name}`}
                          title={`Edit ${item.name}`}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-warm-200 text-slate-500 hover:border-accent-300 hover:text-accent-700"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
      </main>

      {showAddModal && (
        <AddMenuItemModal onClose={() => setShowAddModal(false)} />
      )}
      {editingItem && (
        <AddMenuItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
