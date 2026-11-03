"use client";

import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { changeStaffPin, setStaffPin, ApiError } from "@/lib/api/staff";
import { setOwnPin } from "@/lib/api/auth";

// One PIN form for every way a personal PIN gets set:
// - "change": someone changing their own PIN from the login screen
//   (needs their current PIN — or the shared one if they never set theirs);
// - "setup":  right after a first login with the shared PIN, choosing their
//   own before they can continue;
// - "admin":  an Admin setting someone else's PIN from Staff & Payroll.
export type PinModalMode = "change" | "setup" | "admin";

const COPY: Record<PinModalMode, { title: string; intro: (name: string) => string; button: string }> = {
  change: {
    title: "Change PIN",
    intro: (name) => `Change ${name}'s own login PIN. Other staff aren't affected.`,
    button: "Update PIN",
  },
  setup: {
    title: "Choose your own PIN",
    intro: (name) =>
      `Welcome, ${name}. Everyone now has their own PIN — choose a 3-digit PIN only you know. You'll use it from now on instead of the shared one.`,
    button: "Save my PIN",
  },
  admin: {
    title: "Set PIN",
    intro: (name) =>
      `Set a new login PIN for ${name} — for example if they've forgotten theirs. Tell them in person.`,
    button: "Set PIN",
  },
};

export function ChangePinModal({
  mode = "change",
  staff,
  onClose,
  onSaved,
}: {
  mode?: PinModalMode;
  staff: { id: string; name: string };
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const copy = COPY[mode];
  const needsCurrent = mode === "change";
  const pinDigits = (v: string) => v.replace(/\D/g, "").slice(0, 3);

  async function handleSave() {
    setError("");
    if (newPin.length !== 3) {
      setError("New PIN must be exactly 3 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("New PIN and confirmation don't match.");
      return;
    }
    setSaving(true);
    try {
      if (mode === "change") await changeStaffPin(staff.id, currentPin, newPin);
      else if (mode === "setup") await setOwnPin(newPin);
      else await setStaffPin(staff.id, newPin);
      // Setting up your own PIN continues straight into the app; the others
      // show a confirmation first.
      if (mode === "setup") onSaved?.();
      else {
        setSaved(true);
        onSaved?.();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save PIN.");
      setSaving(false);
    }
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
          <h3 className="font-extrabold text-slate-900">{copy.title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-slate-500 font-semibold mb-4">{copy.intro(staff.name)}</p>

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
              {needsCurrent && (
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
              )}
              <div>
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                  New PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus={!needsCurrent}
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
              disabled={(needsCurrent && !currentPin) || !newPin || !confirmPin || saving}
              className="w-full mt-4 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-2.5 transition-colors"
            >
              {saving ? "Saving…" : copy.button}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
