"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { usePosStore } from "@/lib/store";
import type { MenuCategory } from "@/lib/types";

const CATEGORY_OPTIONS: MenuCategory[] = [
  "Main",
  "Extra",
  "Drinks",
  "Water",
  "Juice",
  "Packaging",
];

export function AddMenuItemModal({ onClose }: { onClose: () => void }) {
  const addMenuItem = usePosStore((s) => s.addMenuItem);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<MenuCategory>("Main");
  const [price, setPrice] = useState("");
  const [veg, setVeg] = useState(false);
  const [isPriority, setIsPriority] = useState(false);
  const [aliases, setAliases] = useState("");
  const [modifiers, setModifiers] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const priceNum = Number(price);
  const canSave = name.trim().length > 0 && priceNum > 0;

  function handleSave() {
    if (!canSave) return;
    const spiceLevels = modifiers
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    addMenuItem({
      name: name.trim(),
      category,
      price: priceNum,
      veg,
      available: true,
      aliases: aliases
        .split(",")
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean),
      spiceLevels: spiceLevels.length > 0 ? spiceLevels : undefined,
      imageUrl: imageUrl.trim() || undefined,
      isPriority: isPriority || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-slate-900">Add Menu Item</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Item name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Beef Pilau"
              className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MenuCategory)}
                className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400 bg-white"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Price (KES)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="500"
                className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Aliases (comma separated, optional)
            </label>
            <input
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="e.g. biryani, biriani"
              className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Modifiers (comma separated, optional)
            </label>
            <input
              value={modifiers}
              onChange={(e) => setModifiers(e.target.value)}
              placeholder="e.g. Wet, Dry, Special, Dry Special"
              className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400"
            />
            <p className="mt-1 text-[11px] text-slate-400 font-semibold">
              Shown as tap-to-choose options before adding the item to an
              order — e.g. preparation style for fish.
            </p>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Image URL (optional)
            </label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400"
            />
            <p className="mt-1 text-[11px] text-slate-400 font-semibold">
              Leave blank to use a category placeholder for now.
            </p>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={veg}
              onChange={(e) => setVeg(e.target.checked)}
              className="h-4 w-4 rounded border-warm-200 accent-emerald-600"
            />
            <span className="text-sm font-bold text-slate-700">
              Vegetarian item
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isPriority}
              onChange={(e) => setIsPriority(e.target.checked)}
              className="h-4 w-4 rounded border-warm-200 accent-accent-600"
            />
            <span className="text-sm font-bold text-slate-700">
              Priority product
            </span>
          </label>
        </div>

        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className="w-full mt-6 rounded-xl bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
        >
          Add to Menu
        </button>
      </div>
    </div>
  );
}
