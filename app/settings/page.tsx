"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, KeyRound, Building2, Smartphone, Percent, Printer } from "lucide-react";
import { usePosStore } from "@/lib/store";
import type { ReceiptWidth } from "@/lib/types";

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof KeyRound;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-warm-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className="text-accent-600" />
        <h2 className="font-extrabold text-slate-900">{title}</h2>
      </div>
      <p className="text-xs text-slate-500 font-semibold mb-4">{description}</p>
      {children}
    </div>
  );
}

function SuccessBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-2 mb-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-2">
      <CheckCircle2 size={14} className="shrink-0" />
      Saved successfully.
    </div>
  );
}

function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function flash() {
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 2500);
  }
  return { saved, flash };
}

export default function SettingsPage() {
  const staffPin = usePosStore((s) => s.staffPin);
  const setStaffPin = usePosStore((s) => s.setStaffPin);
  const settings = usePosStore((s) => s.restaurantSettings);
  const updateRestaurantSettings = usePosStore((s) => s.updateRestaurantSettings);

  // --- Change PIN ---
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const pinFlash = useSavedFlash();

  const pinDigits = (v: string) => v.replace(/\D/g, "").slice(0, 3);

  function handleChangePin() {
    setPinError("");
    if (currentPin !== staffPin) {
      setPinError("Current PIN is incorrect.");
      return;
    }
    if (newPin.length !== 3) {
      setPinError("New PIN must be exactly 3 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("New PIN and confirmation don't match.");
      return;
    }
    setStaffPin(newPin);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    pinFlash.flash();
  }

  // --- Restaurant details ---
  const [name, setName] = useState(settings.name);
  const [address, setAddress] = useState(settings.address);
  const [kraPin, setKraPin] = useState(settings.kraPin);
  const [phone, setPhone] = useState(settings.phone);
  const detailsFlash = useSavedFlash();
  const canSaveDetails = name.trim() !== "" && address.trim() !== "";

  function handleSaveDetails() {
    if (!canSaveDetails) return;
    updateRestaurantSettings({
      name: name.trim(),
      address: address.trim(),
      kraPin: kraPin.trim(),
      phone: phone.trim(),
    });
    detailsFlash.flash();
  }

  // --- Till number ---
  const [tillNumber, setTillNumber] = useState(settings.tillNumber);
  const tillFlash = useSavedFlash();

  function handleSaveTill() {
    if (!tillNumber.trim()) return;
    updateRestaurantSettings({ tillNumber: tillNumber.trim() });
    tillFlash.flash();
  }

  // --- VAT rate ---
  const [vatPercent, setVatPercent] = useState(String(Math.round(settings.vatRate * 100)));
  const vatFlash = useSavedFlash();
  const vatPercentNum = Number(vatPercent);
  const canSaveVat = vatPercent.trim() !== "" && vatPercentNum >= 0 && vatPercentNum <= 100;

  function handleSaveVat() {
    if (!canSaveVat) return;
    updateRestaurantSettings({ vatRate: vatPercentNum / 100 });
    vatFlash.flash();
  }

  // --- Receipt width ---
  const receiptFlash = useSavedFlash();
  function handleSetReceiptWidth(width: ReceiptWidth) {
    updateRestaurantSettings({ receiptWidth: width });
    receiptFlash.flash();
  }

  return (
    <div className="flex-1 flex flex-col lg:h-full lg:overflow-hidden">
      <header className="shrink-0 h-16 flex items-center px-6 border-b border-warm-200 bg-white">
        <h1 className="text-xl font-black text-slate-900">Settings</h1>
      </header>

      <main className="flex-1 lg:min-h-0 overflow-y-auto p-6 space-y-6 max-w-2xl">
        <SettingsCard
          icon={KeyRound}
          title="Change PIN"
          description="The shared PIN every staff member uses to log in. Changing it applies immediately for everyone."
        >
          <SuccessBanner show={pinFlash.saved} />
          {pinError && (
            <div className="mb-3 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold px-3 py-2">
              {pinError}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Current PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
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
            onClick={handleChangePin}
            disabled={!currentPin || !newPin || !confirmPin}
            className="w-full mt-4 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-2.5 transition-colors"
          >
            Update PIN
          </button>
        </SettingsCard>

        <SettingsCard
          icon={Building2}
          title="Restaurant Details"
          description="Shown on every printed bill — name, address, KRA PIN, and phone number."
        >
          <SuccessBanner show={detailsFlash.saved} />
          <div className="space-y-3">
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Restaurant name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Address
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                  KRA PIN
                </label>
                <input
                  value={kraPin}
                  onChange={(e) => setKraPin(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent-400"
                />
              </div>
              <div>
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                  Phone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent-400"
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveDetails}
            disabled={!canSaveDetails}
            className="w-full mt-4 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-2.5 transition-colors"
          >
            Save Details
          </button>
        </SettingsCard>

        <SettingsCard
          icon={Smartphone}
          title="M-Pesa Till Number"
          description="Printed in the LIPA NA MPESA / BUY GOODS section of every bill."
        >
          <SuccessBanner show={tillFlash.saved} />
          <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
            Till number
          </label>
          <input
            value={tillNumber}
            onChange={(e) => setTillNumber(e.target.value)}
            placeholder="e.g. 974366"
            className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400"
          />
          <button
            type="button"
            onClick={handleSaveTill}
            disabled={!tillNumber.trim()}
            className="w-full mt-4 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-2.5 transition-colors"
          >
            Save Till Number
          </button>
        </SettingsCard>

        <SettingsCard
          icon={Percent}
          title="VAT Rate"
          description="Applied to every order total, from the order screen through to the final bill."
        >
          <SuccessBanner show={vatFlash.saved} />
          <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
            VAT percentage
          </label>
          <div className="relative mt-1 w-full sm:w-40">
            <input
              type="number"
              min={0}
              max={100}
              value={vatPercent}
              onChange={(e) => setVatPercent(e.target.value)}
              className="w-full rounded-lg border border-warm-200 pl-3 pr-8 py-2 text-sm font-bold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              %
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveVat}
            disabled={!canSaveVat}
            className="w-full mt-4 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-2.5 transition-colors"
          >
            Save VAT Rate
          </button>
        </SettingsCard>

        <SettingsCard
          icon={Printer}
          title="Receipt Paper Width"
          description="Matches the physical paper loaded in your receipt printer, so bills print at the right size instead of being cut off or leaving blank space."
        >
          <SuccessBanner show={receiptFlash.saved} />
          <div className="grid grid-cols-2 gap-2">
            {(["58mm", "80mm"] as ReceiptWidth[]).map((width) => (
              <button
                key={width}
                type="button"
                onClick={() => handleSetReceiptWidth(width)}
                className={clsx(
                  "rounded-xl border-2 py-3 font-extrabold text-sm transition-colors",
                  settings.receiptWidth === width
                    ? "border-accent-600 bg-accent-50 text-accent-700"
                    : "border-warm-200 text-slate-500 hover:border-accent-300"
                )}
              >
                {width}
              </button>
            ))}
          </div>
        </SettingsCard>
      </main>
    </div>
  );
}
