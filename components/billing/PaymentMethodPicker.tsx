"use client";

import { useState } from "react";
import clsx from "clsx";
import { Smartphone, Banknote, Loader2, CheckCircle2 } from "lucide-react";
import type { PaymentMethod } from "@/lib/types";
import { formatKES } from "@/lib/utils";

const METHODS: { id: PaymentMethod; label: string; icon: typeof Smartphone }[] = [
  { id: "mpesa", label: "M-Pesa", icon: Smartphone },
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
    customerName?: string;
    isCashSubstitution?: boolean;
  }) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("mpesa");
  const [mpesaCode, setMpesaCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [cashSubstitution, setCashSubstitution] = useState(false);
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
    setMpesaCode("");
    setCustomerName("");
    setCashSubstitution(false);
  }

  const targetAmount = partialMode ? Number(partialAmount) || 0 : balanceDue;

  const canFull = !processing;
  const canConfirmPartial =
    !processing && targetAmount > 0 && targetAmount <= balanceDue;

  function handlePartialAmountChange(value: string) {
    const n = Number(value);
    if (value !== "" && n > balanceDue) {
      setPartialAmount(String(balanceDue));
    } else {
      setPartialAmount(value);
    }
  }

  function reset() {
    setMpesaCode("");
    setCustomerName("");
    setCashSubstitution(false);
    setPartialMode(false);
    setPartialAmount("");
  }

  async function confirmMpesaPayment(amount: number) {
    setProcessing(true);
    try {
      onRecorded({
        method: "mpesa",
        amount,
        reference: mpesaCode.trim(),
        customerName: customerName.trim() || undefined,
        isCashSubstitution: cashSubstitution || undefined,
      });
      reset();
    } finally {
      setProcessing(false);
    }
  }

  async function confirmCashReceived() {
    setProcessing(true);
    try {
      // Cash the waiter has physically collected — recorded in full so the
      // cashier knows exactly how much to reconcile with this waiter later.
      onRecorded({
        method: "cash",
        amount: balanceDue,
        reference: "Received by waiter",
      });
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

      <div className="grid grid-cols-2 gap-2 mb-4">
        {METHODS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMethod(id)}
            className={clsx(
              "flex items-center justify-center gap-2 rounded-xl border-2 py-3 font-extrabold text-sm transition-colors",
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
        <>
          <div className="mb-3">
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Customer Name
            </label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. John Otieno"
              className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400"
            />
          </div>

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

          <label className="flex items-start gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={cashSubstitution}
              onChange={(e) => setCashSubstitution(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-warm-200 text-accent-600 focus:ring-accent-400"
            />
            <span className="text-xs font-semibold text-slate-600">
              Sent to my personal M-Pesa, not the till — this counts as cash
              and needs to be dropped with the cashier.
            </span>
          </label>

          {!partialMode ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canFull}
                onClick={() => confirmMpesaPayment(balanceDue)}
                className="flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
              >
                {processing && <Loader2 size={16} className="animate-spin" />}
                Full Payment
              </button>
              <button
                type="button"
                disabled={processing}
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
                  className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                  onClick={() => confirmMpesaPayment(targetAmount)}
                  className="flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
                >
                  {processing && <Loader2 size={16} className="animate-spin" />}
                  Confirm Partial
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {method === "cash" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-semibold">
            Collect {formatKES(balanceDue)} in cash from the customer, then
            close the bill. This is logged against you for the cashier to
            reconcile at the end of your shift.
          </p>
          <button
            type="button"
            disabled={processing}
            onClick={confirmCashReceived}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
          >
            {processing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            Close
          </button>
        </div>
      )}
    </div>
  );
}
