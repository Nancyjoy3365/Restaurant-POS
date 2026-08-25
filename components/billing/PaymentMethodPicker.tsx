"use client";

import { useState } from "react";
import clsx from "clsx";
import { Smartphone, CreditCard, Banknote, Loader2 } from "lucide-react";
import type { PaymentMethod } from "@/lib/types";
import { formatKES } from "@/lib/utils";
import {
  simulateMpesaPayment,
  simulateCardPayment,
  simulateCashPayment,
} from "@/lib/mock-integrations";

const METHODS: { id: PaymentMethod; label: string; icon: typeof Smartphone }[] = [
  { id: "mpesa", label: "M-Pesa", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "cash", label: "Cash", icon: Banknote },
];

export function PaymentMethodPicker({
  total,
  disabled,
  onConfirmed,
}: {
  total: number;
  disabled: boolean;
  onConfirmed: (method: PaymentMethod, ref: string) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("mpesa");
  const [phone, setPhone] = useState("");
  const [tendered, setTendered] = useState("");
  const [processing, setProcessing] = useState(false);

  const tenderedNum = Number(tendered) || 0;
  const change = Math.max(0, tenderedNum - total);
  const canConfirm =
    !disabled &&
    !processing &&
    (method !== "mpesa" || phone.trim().length >= 9) &&
    (method !== "cash" || tenderedNum >= total);

  async function handleConfirm() {
    setProcessing(true);
    try {
      if (method === "mpesa") {
        const { ref } = await simulateMpesaPayment(phone);
        onConfirmed("mpesa", ref);
      } else if (method === "card") {
        const { ref } = await simulateCardPayment();
        onConfirmed("card", ref);
      } else {
        const { ref } = simulateCashPayment(tenderedNum, total);
        onConfirmed("cash", ref);
      }
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-extrabold text-slate-900 mb-3">Payment</h2>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {METHODS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMethod(id)}
            className={clsx(
              "flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 font-extrabold text-sm transition-colors",
              method === id
                ? "border-accent-600 bg-accent-50 text-accent-700"
                : "border-slate-200 text-slate-500 hover:border-accent-300"
            )}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>

      {method === "mpesa" && (
        <div className="mb-4">
          <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
            Guest phone number
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07xx xxx xxx"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400"
          />
        </div>
      )}

      {method === "cash" && (
        <div className="mb-4 space-y-2">
          <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
            Amount tendered
          </label>
          <input
            type="number"
            value={tendered}
            onChange={(e) => setTendered(e.target.value)}
            placeholder={String(total)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400"
          />
          {tenderedNum > 0 && (
            <div className="flex justify-between text-sm font-bold text-slate-600">
              <span>Change due</span>
              <span>{formatKES(change)}</span>
            </div>
          )}
        </div>
      )}

      {method === "card" && (
        <p className="mb-4 text-sm text-slate-500 font-semibold">
          Insert or tap card on the terminal, then confirm.
        </p>
      )}

      <button
        type="button"
        disabled={!canConfirm}
        onClick={handleConfirm}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
      >
        {processing && <Loader2 size={16} className="animate-spin" />}
        {processing
          ? "Processing…"
          : `Confirm Payment · ${formatKES(total)}`}
      </button>
    </div>
  );
}
