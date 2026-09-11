"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useVendors } from "@/lib/hooks/useInventory";
import { createIngredient, updateIngredient, ApiError } from "@/lib/api/inventory";
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
  "Pieces",
];

const UNIT_OPTIONS = ["kg", "litre", "pc", "g", "ml"];

export function AddIngredientModal({
  item,
  onClose,
  onSaved,
}: {
  // When provided, the modal edits this existing ingredient's own fields
  // (a name/packaging/threshold correction) instead of creating a new one.
  // Restocking an existing item is a separate flow (RestockModal) — it
  // creates a purchase obligation with a vendor, which a plain correction
  // here never should.
  item?: Ingredient;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { vendors } = useVendors();
  const isEditing = Boolean(item);

  const [name, setName] = useState(item?.name ?? "");
  const [packaging, setPackaging] = useState(item?.packaging ?? PACKAGING_OPTIONS[0]);
  const [amount, setAmount] = useState(item ? String(item.totalCost) : "");
  const [piece, setPiece] = useState(item ? String(item.piecesPerPackage) : "");
  const [unit, setUnit] = useState(item?.unit ?? UNIT_OPTIONS[0]);
  const [unitAmount, setUnitAmount] = useState(
    item ? String(item.unitAmount ?? 1) : "1"
  );
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A single package is bought/created here — quantity (packages on hand)
  // is fixed at 1; restocking more packages later is RestockModal's job.
  const quantityNum = item?.quantity ?? 1;
  const amountNum = Number(amount) || 0;
  const pieceNum = Number(piece) || 0;
  const unitAmountNum = Number(unitAmount) || 0;
  const unitCost = pieceNum > 0 ? amountNum / pieceNum : 0;
  // A brand-new item is also its opening purchase — a vendor obligation is
  // created either way, so a vendor is required here too, not just on
  // restock. Editing an existing item's own fields needs no vendor.
  const canSave =
    name.trim().length > 0 &&
    amountNum > 0 &&
    pieceNum > 0 &&
    unitAmountNum >= 1 &&
    unitAmountNum <= 100 &&
    (isEditing || Boolean(vendorId)) &&
    !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const fields = {
      name: name.trim(),
      packaging,
      totalCost: amountNum,
      quantity: quantityNum,
      piecesPerPackage: pieceNum,
      unit,
      unitAmount: unitAmountNum,
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
    try {
      if (item) {
        await updateIngredient(item.id, fields);
      } else {
        await createIngredient(fields, { vendorId });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save ingredient.");
      setSaving(false);
    }
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

          {!isEditing && (
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Vendor
              </label>
              {vendors.length === 0 ? (
                <p className="mt-1 text-xs font-semibold text-rose-600">
                  No vendors yet — add one on the Vendors tab before stocking
                  an item, so this purchase has somewhere to be owed to.
                </p>
              ) : (
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400 bg-white"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Unit of measure
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
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Unit
              </label>
              <input
                type="number"
                min="1"
                max="100"
                step="0.1"
                value={unitAmount}
                onChange={(e) => setUnitAmount(e.target.value)}
                placeholder="e.g. 2.5"
                className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
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

        {error && (
          <p className="mt-4 text-xs font-semibold text-rose-600">{error}</p>
        )}

        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className="w-full mt-6 rounded-xl bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
        >
          {saving ? "Saving…" : isEditing ? "Save Changes" : "Add to Inventory"}
        </button>
      </div>
    </div>
  );
}
