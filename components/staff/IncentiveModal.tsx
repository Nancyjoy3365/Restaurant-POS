"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES, formatDateTime } from "@/lib/utils";
import type { StaffMember } from "@/lib/types";

export function IncentiveModal({
  staff,
  onClose,
}: {
  staff: StaffMember;
  onClose: () => void;
}) {
  const incentiveRecords = usePosStore((s) => s.incentiveRecords);
  const addIncentiveRecord = usePosStore((s) => s.addIncentiveRecord);
  const currentStaffId = usePosStore((s) => s.currentStaffId);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const staffIncentives = incentiveRecords
    .filter((r) => r.staffId === staff.id)
    .sort((a, b) => b.dateGiven - a.dateGiven);

  const amountNum = Number(amount) || 0;
  const canSave = amountNum > 0 && reason.trim() !== "";

  function handleSave() {
    if (!canSave) return;
    addIncentiveRecord({
      staffId: staff.id,
      amount: amountNum,
      reason: reason.trim(),
      dateGiven: Date.now(),
      givenBy: currentStaffId ?? undefined,
    });
    setAmount("");
    setReason("");
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
            Incentives — {staff.name}
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

        <div className="space-y-3 mt-4">
          <div>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Amount (KES)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
              autoFocus
              className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Reason
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Hit sales target this week"
              className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent-400"
            />
          </div>

          <button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-2.5 transition-colors"
          >
            <Plus size={15} /> Add Incentive
          </button>
        </div>

        <div className="mt-5 pt-4 border-t border-warm-100">
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-2">
            Past incentives
          </p>
          {staffIncentives.length === 0 ? (
            <p className="text-xs text-slate-400 font-semibold">
              No incentives recorded yet.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {staffIncentives.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    {r.reason}
                    <span className="text-slate-400 font-semibold">
                      {" "}
                      · {formatDateTime(r.dateGiven)}
                    </span>
                  </span>
                  <span className="font-extrabold text-emerald-700 whitespace-nowrap">
                    +{formatKES(r.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
