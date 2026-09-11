"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createServiceExpense, updateServiceExpense, ApiError } from "@/lib/api/inventoryExtras";
import type { ServiceExpense } from "@/lib/types";

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function AddServiceExpenseModal({
  expense,
  onClose,
  onSaved,
}: {
  expense?: ServiceExpense;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const isEditing = Boolean(expense);

  const [description, setDescription] = useState(expense?.description ?? "");
  const [category, setCategory] = useState(expense?.category ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [date, setDate] = useState(
    expense ? toISODate(new Date(expense.incurredAt)) : toISODate(new Date())
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNum = Number(amount) || 0;
  const canSave =
    description.trim().length > 0 &&
    category.trim().length > 0 &&
    amountNum > 0 &&
    date.trim().length > 0 &&
    !saving;

  async function handleSave() {
    if (!canSave) return;
    const fields = {
      description: description.trim(),
      category: category.trim(),
      amount: amountNum,
      incurredAt: parseLocalDate(date),
    };
    setSaving(true);
    setError(null);
    try {
      if (expense) {
        await updateServiceExpense(expense.id, fields);
      } else {
        await createServiceExpense(fields);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save expense.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-slate-900">
            {isEditing ? "Edit Service / Repair" : "Add Service / Repair"}
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
              Description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Garbage collection - September"
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
              placeholder="e.g. Garbage Collection, Repairs, Maintenance"
              className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Amount (KES)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 500"
                className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-accent-400"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-xs font-semibold text-rose-600">{error}</p>
        )}

        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className="w-full mt-6 rounded-xl bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
        >
          {saving ? "Saving…" : isEditing ? "Save Changes" : "Add Expense"}
        </button>
      </div>
    </div>
  );
}
