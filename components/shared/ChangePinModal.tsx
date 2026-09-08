"use client";

import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { usePosStore } from "@/lib/store";

export function ChangePinModal({ onClose }: { onClose: () => void }) {
  const staffPin = usePosStore((s) => s.staffPin);
  const setStaffPin = usePosStore((s) => s.setStaffPin);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const pinDigits = (v: string) => v.replace(/\D/g, "").slice(0, 3);

  function handleSave() {
    setError("");
    if (currentPin !== staffPin) {
      setError("Current PIN is incorrect.");
      return;
    }
    if (newPin.length !== 3) {
      setError("New PIN must be exactly 3 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("New PIN and confirmation don't match.");
      return;
    }
    setStaffPin(newPin);
    setSaved(true);
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
          <h3 className="font-extrabold text-slate-900">Change PIN</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-slate-500 font-semibold mb-4">
          This is the shared PIN every staff member uses to log in. Changing
          it applies immediately for everyone.
        </p>

        {saved ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-bold px-3 py-2.5">
            <CheckCircle2 size={16} className="shrink-0" />
            PIN updated successfully.
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-3 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold px-3 py-2">
                {error}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                  Current PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  value={currentPin}
                  onChange={(e) => setCurrentPin(pinDigits(e.target.value))}
                  placeholder="•••"
                  className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400 tracking-widest"
                />
              </div>
              <div>
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                  New PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(pinDigits(e.target.value))}
                  placeholder="•••"
                  className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400 tracking-widest"
                />
              </div>
              <div>
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                  Confirm New PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(pinDigits(e.target.value))}
                  placeholder="•••"
                  className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400 tracking-widest"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!currentPin || !newPin || !confirmPin}
              className="w-full mt-4 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-2.5 transition-colors"
            >
              Update PIN
            </button>
          </>
        )}
      </div>
    </div>
  );
}
