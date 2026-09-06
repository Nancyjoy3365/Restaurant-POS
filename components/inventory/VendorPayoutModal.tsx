"use client";

import { useState } from "react";
import clsx from "clsx";
import { X, Banknote, Smartphone } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import type { Vendor, VendorPaymentMethod } from "@/lib/types";

const PAYMENT_METHODS: { id: VendorPaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "mpesa", label: "M-Pesa", icon: Smartphone },
];

export function VendorPayoutModal({
  vendor,
  balanceOwed,
  onClose,
}: {
  vendor: Vendor;
  balanceOwed: number;
  onClose: () => void;
}) {
  const recordVendorPayout = usePosStore((s) => s.recordVendorPayout);

  const [amount, setAmount] = useState(
    balanceOwed > 0 ? String(balanceOwed) : ""
  );
  const [method, setMethod] = useState<VendorPaymentMethod>("cash");
  const [reference, setReference] = useState("");

  const amountNum = Number(amount) || 0;
  const referenceOk = method === "cash" || reference.trim() !== "";
  const canConfirm = amountNum > 0 && referenceOk;

  function handleConfirm() {
    if (!canConfirm) return;
    recordVendorPayout(
      vendor.id,
      amountNum,
      method,
      method === "mpesa" ? reference : undefined
    );
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-extrabold text-slate-900">
            Pay {vendor.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-slate-500 font-semibold mb-3">
          Settles this vendor&rsquo;s oldest unpaid purchases first, up to the
          amount you enter.
        </p>

        <div className="rounded-lg bg-warm-50 px-3 py-2.5 mb-4">
          <div className="flex justify-between text-sm font-black text-slate-900">
            <span>Balance Owed</span>
            <span>{formatKES(balanceOwed)}</span>
          </div>
        </div>

        <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
          Method
        </label>
        <div className="grid grid-cols-2 gap-2 mt-1 mb-3">
          {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMethod(id)}
              className={clsx(
                "flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 font-extrabold text-sm transition-colors",
                method === id
                  ? "border-accent-600 bg-accent-50 text-accent-700"
                  : "border-warm-200 text-slate-500 hover:border-accent-300"
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
          Amount (KES)
        </label>
        <input
          type="number"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />

        {method === "mpesa" && (
          <div className="mt-3">
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              M-Pesa Code
            </label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. QAB1XYZ23"
              className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400"
            />
          </div>
        )}

        <button
          type="button"
          disabled={!canConfirm}
          onClick={handleConfirm}
          className="w-full mt-4 flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
        >
          <Banknote size={16} /> Confirm Payout
        </button>
      </div>
    </div>
  );
}
