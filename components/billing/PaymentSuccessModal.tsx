"use client";

import { CheckCircle2 } from "lucide-react";
import { formatKES } from "@/lib/utils";

export function PaymentSuccessModal({
  label,
  total,
  onClose,
}: {
  label: string;
  total: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-8 flex flex-col items-center text-center">
        <span className="h-16 w-16 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
          <CheckCircle2 size={32} />
        </span>
        <h2 className="font-black text-lg text-slate-900 mb-1">
          Payment Successful
        </h2>
        <p className="text-sm font-semibold text-slate-500 mb-6">
          {label} · {formatKES(total)}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-accent-600 hover:bg-accent-700 text-white font-extrabold py-3 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
