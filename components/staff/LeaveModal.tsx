"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { toDateKey } from "@/lib/utils";
import type { LeaveRecord, LeaveStatus, StaffMember } from "@/lib/types";

function formatDateLabel(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
  });
}

export function LeaveModal({
  staff,
  onClose,
}: {
  staff: StaffMember;
  onClose: () => void;
}) {
  const leaveRecords = usePosStore((s) => s.leaveRecords);
  const addLeaveRecord = usePosStore((s) => s.addLeaveRecord);
  const updateLeaveRecord = usePosStore((s) => s.updateLeaveRecord);
  const deleteLeaveRecord = usePosStore((s) => s.deleteLeaveRecord);

  const todayKey = toDateKey(new Date());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(todayKey);
  const [endDate, setEndDate] = useState(todayKey);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<LeaveStatus>("approved");
  const [isPaid, setIsPaid] = useState(false);
  const [requestedAt, setRequestedAt] = useState<number | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const staffLeave = leaveRecords
    .filter((l) => l.staffId === staff.id)
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));

  const canSave = startDate !== "" && endDate !== "" && endDate >= startDate;
  const isEditing = editingId !== null;

  function resetForm() {
    setEditingId(null);
    setStartDate(todayKey);
    setEndDate(todayKey);
    setReason("");
    setStatus("approved");
    setIsPaid(false);
    setRequestedAt(undefined);
  }

  function showSuccess(message: string) {
    if (successTimer.current) clearTimeout(successTimer.current);
    setSuccessMessage(message);
    successTimer.current = setTimeout(() => setSuccessMessage(null), 2500);
  }

  function handleSave() {
    if (!canSave) return;
    const fields = {
      staffId: staff.id,
      startDate,
      endDate,
      reason: reason.trim(),
      status,
      isPaid,
      requestedAt: requestedAt ?? Date.now(),
    };
    if (editingId) {
      updateLeaveRecord(editingId, fields);
      showSuccess("Leave updated successfully.");
    } else {
      addLeaveRecord(fields);
      showSuccess("Leave added successfully.");
    }
    resetForm();
  }

  function startEdit(l: LeaveRecord) {
    setEditingId(l.id);
    setStartDate(l.startDate);
    setEndDate(l.endDate);
    setReason(l.reason);
    setStatus(l.status);
    setIsPaid(l.isPaid);
    setRequestedAt(l.requestedAt);
    setSuccessMessage(null);
  }

  function handleDelete(id: string) {
    deleteLeaveRecord(id);
    if (editingId === id) resetForm();
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
          <h3 className="font-extrabold text-slate-900">Leave — {staff.name}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {successMessage && (
          <div className="flex items-center gap-2 mt-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-2">
            <CheckCircle2 size={14} className="shrink-0" />
            {successMessage}
          </div>
        )}

        <div className="space-y-3 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Reason
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Family emergency"
              className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent-400"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Status
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(["approved", "pending"] as LeaveStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-lg border-2 py-2 text-xs font-extrabold capitalize transition-colors ${
                    status === s
                      ? "border-accent-600 bg-accent-50 text-accent-700"
                      : "border-warm-200 text-slate-500 hover:border-accent-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-warm-200 text-accent-600 focus:ring-accent-400"
            />
            <span className="text-xs font-semibold text-slate-600">
              Paid leave — credits their daily rate for these days even
              without a clock-in. Leave unchecked for unpaid leave.
            </span>
          </label>

          <div className="flex gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border-2 border-warm-200 text-slate-500 hover:border-slate-300 font-extrabold px-4 py-2.5 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              disabled={!canSave}
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-2.5 transition-colors"
            >
              {isEditing ? (
                "Save Changes"
              ) : (
                <>
                  <Plus size={15} /> Add Leave
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-warm-100">
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-2">
            Past &amp; upcoming leave
          </p>
          {staffLeave.length === 0 ? (
            <p className="text-xs text-slate-400 font-semibold">
              No leave recorded yet.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {staffLeave.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-bold text-slate-700 min-w-0">
                    {formatDateLabel(l.startDate)} – {formatDateLabel(l.endDate)}
                    {l.reason && (
                      <span className="text-slate-400 font-semibold">
                        {" "}
                        · {l.reason}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize bg-slate-100 text-slate-500">
                      {l.isPaid ? "Paid" : "Unpaid"}
                    </span>
                    <span
                      className={`rounded-full text-[10px] font-extrabold px-2 py-0.5 capitalize ${
                        l.status === "approved"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {l.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(l)}
                      aria-label="Edit leave entry"
                      title="Edit"
                      className="text-slate-400 hover:text-accent-700"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(l.id)}
                      aria-label="Delete leave entry"
                      title="Delete"
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 size={12} />
                    </button>
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
