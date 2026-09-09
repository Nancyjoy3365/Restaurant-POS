"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  CheckCircle2,
  Building2,
  Smartphone,
  Percent,
  Printer,
  Truck,
  Plus,
  Pencil,
  Banknote,
  History,
  Ban,
  RotateCcw,
} from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import { AddVendorModal } from "@/components/inventory/AddVendorModal";
import { VendorPayoutModal } from "@/components/inventory/VendorPayoutModal";
import { VendorHistoryModal } from "@/components/inventory/VendorHistoryModal";
import type { ReceiptWidth, Vendor } from "@/lib/types";

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Building2;
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
  const settings = usePosStore((s) => s.restaurantSettings);
  const updateRestaurantSettings = usePosStore((s) => s.updateRestaurantSettings);
  const vendors = usePosStore((s) => s.vendors);
  const stockPurchases = usePosStore((s) => s.stockPurchases);
  const setVendorActive = usePosStore((s) => s.setVendorActive);

  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [payoutVendor, setPayoutVendor] = useState<Vendor | null>(null);
  const [historyVendor, setHistoryVendor] = useState<Vendor | null>(null);

  function balanceOwed(vendorId: string): number {
    return stockPurchases
      .filter((p) => p.vendorId === vendorId && !p.paid)
      .reduce((sum, p) => sum + p.totalCost, 0);
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

      <main className="flex-1 lg:min-h-0 overflow-y-auto p-6 space-y-6 max-w-4xl">
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

        <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-warm-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Truck size={16} className="text-accent-600" />
                <h2 className="font-extrabold text-slate-900">Vendors</h2>
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                Suppliers you buy stock from — track balances owed and settle payouts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddVendorModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white text-sm font-extrabold px-4 py-2.5 transition-colors"
            >
              <Plus size={16} strokeWidth={3} /> Add Vendor
            </button>
          </div>
          {vendors.length === 0 ? (
            <p className="text-slate-400 font-semibold text-center py-12">
              No vendors yet — use &ldquo;Add Vendor&rdquo; to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Vendor</th>
                    <th className="text-left px-2 py-3">Category</th>
                    <th className="text-right px-2 py-3">Balance Owed</th>
                    <th className="text-center px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[...vendors]
                    .sort(
                      (a, b) => Number(a.active === false) - Number(b.active === false)
                    )
                    .map((v) => {
                      const owed = balanceOwed(v.id);
                      const isActive = v.active !== false;
                      return (
                        <tr
                          key={v.id}
                          className={clsx(
                            "border-t border-slate-100",
                            !isActive && "bg-slate-50 opacity-60"
                          )}
                        >
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {v.name}
                            {!isActive && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-slate-200 text-slate-600 text-[10px] font-extrabold px-2 py-0.5 align-middle">
                                Deactivated
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-slate-600 font-semibold">
                            {v.category}
                          </td>
                          <td
                            className={clsx(
                              "px-2 py-3 text-right font-extrabold",
                              owed > 0 ? "text-amber-600" : "text-slate-400"
                            )}
                          >
                            {formatKES(owed)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setHistoryVendor(v)}
                                aria-label={`View history for ${v.name}`}
                                title="Purchase & payment history"
                                className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-warm-200 text-slate-500 hover:border-accent-300 hover:text-accent-700"
                              >
                                <History size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPayoutVendor(v)}
                                disabled={owed <= 0}
                                aria-label={`Add payout for ${v.name}`}
                                title={
                                  owed <= 0
                                    ? "Nothing owed to this vendor yet — restock an item with them selected as the vendor first"
                                    : "Add payout"
                                }
                                className="inline-flex items-center gap-1.5 rounded-full bg-accent-600 hover:bg-accent-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-extrabold px-3 py-1.5"
                              >
                                <Banknote size={12} /> Payout
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingVendor(v)}
                                aria-label={`Edit ${v.name}`}
                                title={`Edit ${v.name}`}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-warm-200 text-slate-500 hover:border-accent-300 hover:text-accent-700"
                              >
                                <Pencil size={14} />
                              </button>
                              {isActive ? (
                                <button
                                  type="button"
                                  onClick={() => setVendorActive(v.id, false)}
                                  disabled={owed > 0}
                                  aria-label={`Deactivate ${v.name}`}
                                  title={
                                    owed > 0
                                      ? "Settle the balance owed before deactivating this vendor"
                                      : `Deactivate ${v.name}`
                                  }
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-warm-200 text-slate-500 hover:border-rose-300 hover:text-rose-600 disabled:opacity-40 disabled:hover:border-warm-200 disabled:hover:text-slate-500"
                                >
                                  <Ban size={14} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setVendorActive(v.id, true)}
                                  aria-label={`Reactivate ${v.name}`}
                                  title={`Reactivate ${v.name}`}
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-warm-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600"
                                >
                                  <RotateCcw size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showAddVendorModal && (
        <AddVendorModal onClose={() => setShowAddVendorModal(false)} />
      )}
      {editingVendor && (
        <AddVendorModal
          vendor={editingVendor}
          onClose={() => setEditingVendor(null)}
        />
      )}
      {payoutVendor && (
        <VendorPayoutModal
          vendor={payoutVendor}
          balanceOwed={balanceOwed(payoutVendor.id)}
          onClose={() => setPayoutVendor(null)}
        />
      )}
      {historyVendor && (
        <VendorHistoryModal
          vendor={historyVendor}
          onClose={() => setHistoryVendor(null)}
        />
      )}
    </div>
  );
}
