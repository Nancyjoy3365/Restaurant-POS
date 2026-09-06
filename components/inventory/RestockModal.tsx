"use client";

import { useState } from "react";
import { X, PackagePlus } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import type { Ingredient } from "@/lib/types";

export function RestockModal({
  item,
  onClose,
}: {
  item: Ingredient;
  onClose: () => void;
}) {
  const vendors = usePosStore((s) => s.vendors);
  const recordStockPurchase = usePosStore((s) => s.recordStockPurchase);

  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");

  const amountNum = Number(amount) || 0;
  const quantityNum = Number(quantity) || 0;
  const totalUnits = quantityNum * item.piecesPerPackage;
  const unitCost = totalUnits > 0 ? amountNum / totalUnits : 0;
  const canSave =
    Boolean(vendorId) && amountNum > 0 && quantityNum > 0;

  function handleSave() {
    if (!canSave) return;
    recordStockPurchase({
      vendorId,
      ingredientId: item.id,
      quantity: quantityNum,
      unitCost,
      totalCost: amountNum,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-black text-slate-900">
            Restock {item.name}
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
        <p className="text-xs text-slate-500 font-semibold mb-4">
          Currently {item.quantity} {item.packaging.toLowerCase()}
          {item.quantity === 1 ? "" : "s"} on hand. This adds to that and
          records what&rsquo;s owed to the vendor.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Vendor
            </label>
            {vendors.length === 0 ? (
              <p className="mt-1 text-xs font-semibold text-rose-600">
                No vendors yet — add one on the Vendors tab before restocking.
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Amount (KES)
              </label>
              <input
                type="number"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 10000"
                className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Quantity ({item.packaging.toLowerCase()}s)
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 10"
                className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div className="rounded-lg bg-warm-50 px-3 py-2.5">
            <div className="flex justify-between text-sm font-black text-slate-900">
              <span>New Unit Cost</span>
              <span>{formatKES(unitCost)}</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {quantityNum > 0
                ? `${item.quantity} + ${quantityNum} = ${item.quantity + quantityNum} ${item.packaging.toLowerCase()}${
                    item.quantity + quantityNum === 1 ? "" : "s"
                  } on hand after this`
                : `Calculated as Amount ÷ (Quantity × ${item.piecesPerPackage} ${item.unit}/${item.packaging.toLowerCase()})`}
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className="w-full mt-6 flex items-center justify-center gap-2 rounded-xl bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
        >
          <PackagePlus size={16} /> Add Stock Purchase
        </button>
      </div>
    </div>
  );
}
