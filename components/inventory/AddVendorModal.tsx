"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { usePosStore } from "@/lib/store";
import type { Vendor, VendorPaymentTerms } from "@/lib/types";

const PAYMENT_TERMS_OPTIONS: { id: VendorPaymentTerms; label: string }[] = [
  { id: "due-on-receipt", label: "Due on receipt" },
  { id: "net-15", label: "Net-15" },
  { id: "net-30", label: "Net-30" },
  { id: "net-60", label: "Net-60" },
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
  const [contactPerson, setContactPerson] = useState(vendor?.contactPerson ?? "");
  const [phone, setPhone] = useState(vendor?.phone ?? "");
  const [paymentTerms, setPaymentTerms] = useState<VendorPaymentTerms>(
    vendor?.paymentTerms ?? "net-30"
  );

  const canSave = name.trim().length > 0 && category.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    const fields = {
      name: name.trim(),
      category: category.trim(),
      active: vendor?.active,
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      paymentTerms,
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
              autoFocus
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Contact person
              </label>
              <input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Jane Wanjiru"
                className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0712345678"
                className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Payment terms
            </label>
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value as VendorPaymentTerms)}
              className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400 bg-white"
            >
              {PAYMENT_TERMS_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
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
