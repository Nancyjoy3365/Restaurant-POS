"use client";

import { useState } from "react";
import clsx from "clsx";
import { X, Banknote, Smartphone } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { toDateKey } from "@/lib/utils";
import type { Vendor, VendorPaymentMethod } from "@/lib/types";

const PAYMENT_METHODS: { id: VendorPaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "mpesa", label: "M-Pesa", icon: Smartphone },
];

export function AddVendorModal({
  vendor,
  onClose,
}: {
  // When provided, the modal edits this existing vendor instead of creating
  // a new one.
  vendor?: Vendor;
  onClose: () => void;
}) {
  const addVendor = usePosStore((s) => s.addVendor);
  const updateVendor = usePosStore((s) => s.updateVendor);
  const isEditing = Boolean(vendor);

  const [name, setName] = useState(vendor?.name ?? "");
  const [category, setCategory] = useState(vendor?.category ?? "");
  const [paymentMethod, setPaymentMethod] = useState<VendorPaymentMethod>(
    vendor?.paymentMethod ?? "cash"
  );
  const [lastPaymentAmount, setLastPaymentAmount] = useState(
    vendor ? String(vendor.lastPaymentAmount) : ""
  );
  const [lastPaymentDate, setLastPaymentDate] = useState(
    vendor?.lastPaymentDate ?? toDateKey(new Date())
  );

  const amountNum = Number(lastPaymentAmount) || 0;
  const canSave = name.trim().length > 0 && category.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    const fields = {
      name: name.trim(),
      category: category.trim(),
      paymentMethod,
      lastPaymentAmount: amountNum,
      lastPaymentDate,
    };
    if (vendor) {
      updateVendor(vendor.id, fields);
    } else {
      addVendor(fields);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-slate-900">
            {isEditing ? "Edit Vendor" : "Add Vendor"}
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
              Vendor name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wangige Grain Millers"
              className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Category
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Grains & Flour"
              className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id)}
                  className={clsx(
                    "flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 font-extrabold text-sm transition-colors",
                    paymentMethod === id
                      ? "border-accent-600 bg-accent-50 text-accent-700"
                      : "border-warm-200 text-slate-500 hover:border-accent-300"
                  )}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Last Payment (KES)
              </label>
              <input
                type="number"
                value={lastPaymentAmount}
                onChange={(e) => setLastPaymentAmount(e.target.value)}
                placeholder="e.g. 24000"
                className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Date
              </label>
              <input
                type="date"
                value={lastPaymentDate}
                onChange={(e) => setLastPaymentDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className="w-full mt-6 rounded-xl bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
        >
          {isEditing ? "Save Changes" : "Add Vendor"}
        </button>
      </div>
    </div>
  );
}
