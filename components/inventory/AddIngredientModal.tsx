"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import type { Ingredient } from "@/lib/types";

const PACKAGING_OPTIONS = [
  "Bale",
  "Crate",
  "Carton",
  "Bag",
  "Tray",
  "Net Bag",
  "Sack",
];

const UNIT_OPTIONS = ["kg", "litre", "pc", "g", "ml"];

export function AddIngredientModal({
  item,
  onClose,
}: {
  // When provided, the modal edits this existing ingredient (a price
  // correction, restock, etc.) instead of creating a new one.
  item?: Ingredient;
  onClose: () => void;
}) {
  const addIngredient = usePosStore((s) => s.addIngredient);
  const updateIngredient = usePosStore((s) => s.updateIngredient);
  const isEditing = Boolean(item);

  const [name, setName] = useState(item?.name ?? "");
  const [packaging, setPackaging] = useState(item?.packaging ?? PACKAGING_OPTIONS[0]);
  const [amount, setAmount] = useState(item ? String(item.totalCost) : "");
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : "");
  const [piece, setPiece] = useState(item ? String(item.piecesPerPackage) : "");
  const [unit, setUnit] = useState(item?.unit ?? UNIT_OPTIONS[0]);

  const amountNum = Number(amount) || 0;
  const quantityNum = Number(quantity) || 0;
  const pieceNum = Number(piece) || 0;
  const unitCost = pieceNum > 0 ? amountNum / pieceNum : 0;
  const canSave = name.trim().length > 0 && amountNum > 0 && quantityNum > 0 && pieceNum > 0;

  function handleSave() {
    if (!canSave) return;
    const fields = {
      name: name.trim(),
      packaging,
      totalCost: amountNum,
      quantity: quantityNum,
      piecesPerPackage: pieceNum,
      unit,
      unitCost,
      // No stock level has been observed yet for a brand-new item, so flag
      // it low as soon as it drops below a third of the opening quantity.
      // An edit keeps whatever threshold was already set.
      reorderThreshold:
        item?.reorderThreshold ?? Math.max(1, Math.round(quantityNum * 0.3)),
      // A price correction on an existing entry isn't a new purchase — only
      // stamp this the first time the item is created.
      purchasedAt: item?.purchasedAt ?? Date.now(),
    };
    if (item) {
      updateIngredient(item.id, fields);
    } else {
      addIngredient(fields);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-slate-900">
            {isEditing ? "Edit Inventory Item" : "Add Inventory Item"}
          </h2>
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
              placeholder="e.g. Unga (Maize Flour)"
              className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Packaging
              </label>
              <select
                value={packaging}
                onChange={(e) => setPackaging(e.target.value)}
                className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400 bg-white"
              >
                {PACKAGING_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400 bg-white"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Amount (KES)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 17280"
                className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 6"
                className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Piece (per package)
            </label>
            <input
              type="number"
              value={piece}
              onChange={(e) => setPiece(e.target.value)}
              placeholder="e.g. 12"
              className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div className="rounded-lg bg-warm-50 px-3 py-2.5">
            <div className="flex justify-between text-sm font-black text-slate-900">
              <span>Unit Cost</span>
              <span>{formatKES(unitCost)}</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              Calculated automatically as Amount ÷ Piece
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className="w-full mt-6 rounded-xl bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
        >
          {isEditing ? "Save Changes" : "Add to Inventory"}
        </button>
      </div>
    </div>
  );
}
