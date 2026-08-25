"use client";

import { useState } from "react";
import clsx from "clsx";
import { Smartphone, CreditCard, Banknote, Loader2 } from "lucide-react";
import type { PaymentMethod } from "@/lib/types";
import { formatKES } from "@/lib/utils";
import { simulateCardPayment, simulateCashPayment } from "@/lib/mock-integrations";

const METHODS: { id: PaymentMethod; label: string; icon: typeof Smartphone }[] = [
  { id: "mpesa", label: "M-Pesa", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "cash", label: "Cash", icon: Banknote },
];

export function PaymentMethodPicker({
  balanceDue,
  onRecorded,
}: {
  balanceDue: number;
  onRecorded: (payment: {
    method: PaymentMethod;
    amount: number;
    reference: string;
  }) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [mpesaCode, setMpesaCode] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [partialMode, setPartialMode] = useState(false);
  const [partialAmount, setPartialAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  // Whenever the balance changes (e.g. after a prior payment), clear the
  // in-progress amount fields so stale numbers don't linger — adjusting
  // state during render per React's guidance, rather than an effect.
  const [lastBalanceDue, setLastBalanceDue] = useState(balanceDue);
  if (balanceDue !== lastBalanceDue) {
    setLastBalanceDue(balanceDue);
    setPartialMode(false);
    setPartialAmount("");
    setCashReceived("");
    setMpesaCode("");
  }

  const targetAmount = partialMode ? Number(partialAmount) || 0 : balanceDue;
  const cashReceivedNum = Number(cashReceived) || 0;
  const change = Math.max(0, cashReceivedNum - targetAmount);
  const cashOk = method !== "cash" || cashReceivedNum >= targetAmount;

  const canFull = method !== null && !processing && (method !== "cash" || cashReceivedNum >= balanceDue);
  const canConfirmPartial =
    method !== null &&
    !processing &&
    targetAmount > 0 &&
    targetAmount <= balanceDue &&
    cashOk;

  function handlePartialAmountChange(value: string) {
    const n = Number(value);
    if (value !== "" && n > balanceDue) {
      setPartialAmount(String(balanceDue));
    } else {
      setPartialAmount(value);
    }
  }

  function reset() {
    setMethod(null);
    setMpesaCode("");
    setCashReceived("");
    setPartialMode(false);
    setPartialAmount("");
  }

  async function confirmPayment(amount: number) {
    if (!method) return;
    setProcessing(true);
    try {
      let reference = "";
      if (method === "mpesa") {
        reference = mpesaCode.trim();
      } else if (method === "card") {
        reference = (await simulateCardPayment()).ref;
      } else {
        reference = simulateCashPayment(cashReceivedNum, amount).ref;
      }
      onRecorded({ method, amount, reference });
      reset();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="rounded-xl border border-warm-200 bg-white p-5">
      <h2 className="font-extrabold text-slate-900 mb-1">Collect Payment</h2>
      <p className="text-xs text-slate-500 font-semibold mb-4">
        Balance due: {formatKES(balanceDue)}
      </p>

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
                : "border-warm-200 text-slate-500 hover:border-accent-300"
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
            M-Pesa Confirmation Code (optional)
          </label>
          <input
            value={mpesaCode}
            onChange={(e) => setMpesaCode(e.target.value)}
            placeholder="e.g. QAB1XYZ23"
            className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400"
          />
        </div>
      )}

      {method === "cash" && (
        <div className="mb-4 space-y-2">
          <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
            Cash received
          </label>
          <input
            type="number"
            value={cashReceived}
            onChange={(e) => setCashReceived(e.target.value)}
            placeholder={String(targetAmount || "")}
            className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400"
          />
          {cashReceivedNum > 0 && (
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

      {!partialMode ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!canFull}
            onClick={() => confirmPayment(balanceDue)}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
          >
            {processing && <Loader2 size={16} className="animate-spin" />}
            Full Payment
          </button>
          <button
            type="button"
            disabled={method === null || processing}
            onClick={() => setPartialMode(true)}
            className="flex items-center justify-center gap-2 rounded-lg border-2 border-accent-300 text-accent-700 hover:bg-accent-50 disabled:border-slate-200 disabled:text-slate-300 font-extrabold py-3 transition-colors"
          >
            Partial Payment
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Amount being paid now (max {formatKES(balanceDue)})
            </label>
            <input
              type="number"
              value={partialAmount}
              onChange={(e) => handlePartialAmountChange(e.target.value)}
              autoFocus
              className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setPartialMode(false);
                setPartialAmount("");
              }}
              className="rounded-lg border-2 border-warm-200 text-slate-500 hover:border-slate-300 font-extrabold py-3 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canConfirmPartial}
              onClick={() => confirmPayment(targetAmount)}
              className="flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
            >
              {processing && <Loader2 size={16} className="animate-spin" />}
              Confirm Partial
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
