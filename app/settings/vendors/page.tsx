"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, Plus, Pencil, Ban, RotateCcw } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { AddVendorModal } from "@/components/inventory/AddVendorModal";
import type { Vendor } from "@/lib/types";

export default function VendorsSettingsPage() {
  const vendors = usePosStore((s) => s.vendors);
  const stockPurchases = usePosStore((s) => s.stockPurchases);
  const setVendorActive = usePosStore((s) => s.setVendorActive);

  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  function balanceOwed(vendorId: string): number {
    return stockPurchases
      .filter((p) => p.vendorId === vendorId && !p.paid)
      .reduce((sum, p) => sum + p.totalCost, 0);
  }

  return (
    <div className="flex-1 flex flex-col lg:h-full lg:overflow-hidden">
      <header className="shrink-0 h-16 flex items-center gap-3 px-6 border-b border-warm-200 bg-white">
        <Link
          href="/settings"
          className="rounded-full p-2 hover:bg-slate-100 text-slate-600"
          aria-label="Back to Settings"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-black text-slate-900">Vendors</h1>
      </header>

      <main className="flex-1 lg:min-h-0 overflow-y-auto p-6 max-w-5xl">
        <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-warm-200">
            <div>
              <h2 className="font-extrabold text-slate-900">Vendors</h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Suppliers you buy stock from — add, edit, and deactivate vendors here.
                Payouts and payment history live on Inventory &rsaquo; Vendor Statement.
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
                    <th className="text-left px-2 py-3">Contact Person</th>
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
                          <td className="px-2 py-3">
                            <div className="font-semibold text-slate-700">
                              {v.contactPerson || "—"}
                            </div>
                            {v.phone && (
                              <div className="text-[11px] text-slate-400 font-semibold">
                                {v.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
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
    </div>
  );
}
