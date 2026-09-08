"use client";

import { useState } from "react";
import clsx from "clsx";
import { Pencil, Plus, PackagePlus, Banknote, History, Ban, RotateCcw } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import { AddIngredientModal } from "@/components/inventory/AddIngredientModal";
import { RestockModal } from "@/components/inventory/RestockModal";
import { AddVendorModal } from "@/components/inventory/AddVendorModal";
import { VendorPayoutModal } from "@/components/inventory/VendorPayoutModal";
import { VendorHistoryModal } from "@/components/inventory/VendorHistoryModal";
import type { Ingredient, Vendor } from "@/lib/types";

type Tab = "stock" | "vendors" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "stock", label: "Stock" },
  { id: "vendors", label: "Vendors" },
  { id: "history", label: "Payment History" },
];

function formatPaymentDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>("stock");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [restockingItem, setRestockingItem] = useState<Ingredient | null>(null);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [payoutVendor, setPayoutVendor] = useState<Vendor | null>(null);
  const [historyVendor, setHistoryVendor] = useState<Vendor | null>(null);
  const [historyVendorFilter, setHistoryVendorFilter] = useState("");
  const ingredients = usePosStore((s) => s.ingredients);
  const vendors = usePosStore((s) => s.vendors);
  const stockPurchases = usePosStore((s) => s.stockPurchases);
  const vendorPayments = usePosStore((s) => s.vendorPayments);
  const setVendorActive = usePosStore((s) => s.setVendorActive);

  const paymentHistory = vendorPayments
    .filter((p) => !historyVendorFilter || p.vendorId === historyVendorFilter)
    .slice()
    .sort((a, b) => b.paidAt - a.paidAt);

  function balanceOwed(vendorId: string): number {
    return stockPurchases
      .filter((p) => p.vendorId === vendorId && !p.paid)
      .reduce((sum, p) => sum + p.totalCost, 0);
  }

  return (
    <div className="flex-1 flex flex-col lg:h-full lg:overflow-hidden">
      <header className="shrink-0 h-16 flex items-center justify-between px-6 border-b border-warm-200 bg-white">
        <h1 className="text-xl font-black text-slate-900">Inventory</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-full border border-warm-200 p-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  "rounded-full px-4 py-1.5 text-xs font-extrabold transition-colors",
                  tab === t.id
                    ? "bg-accent-600 text-white"
                    : "text-slate-500 hover:text-accent-700"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === "stock" && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white text-sm font-extrabold px-4 py-2.5 transition-colors"
            >
              <Plus size={16} strokeWidth={3} /> Add Item
            </button>
          )}
          {tab === "vendors" && (
            <button
              type="button"
              onClick={() => setShowAddVendorModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white text-sm font-extrabold px-4 py-2.5 transition-colors"
            >
              <Plus size={16} strokeWidth={3} /> Add Vendor
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 lg:min-h-0 overflow-y-auto p-6">
        {tab === "stock" && (
          <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
            {ingredients.length === 0 ? (
              <p className="text-slate-400 font-semibold text-center py-12">
                No stock items yet — use &ldquo;Add Item&rdquo; to get started.
              </p>
            ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Item</th>
                  <th className="text-left px-2 py-3">Packaging</th>
                  <th className="text-right px-2 py-3">Amount</th>
                  <th className="text-right px-2 py-3">Quantity</th>
                  <th className="text-right px-2 py-3">Piece</th>
                  <th className="text-right px-2 py-3">Unit Cost</th>
                  <th className="text-left px-2 py-3">Unit</th>
                  <th className="text-center px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing) => {
                  return (
                    <tr key={ing.id} className="border-t border-warm-100">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {ing.name}
                      </td>
                      <td className="px-2 py-3 text-slate-600 font-semibold">
                        {ing.packaging}
                      </td>
                      <td className="px-2 py-3 text-right font-bold text-slate-900">
                        {formatKES(ing.totalCost)}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-700">
                        {ing.quantity}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-700">
                        {ing.piecesPerPackage}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-700">
                        {formatKES(ing.unitCost)}
                      </td>
                      <td className="px-2 py-3 text-slate-500 font-semibold">
                        {ing.unitAmount ?? 1} {ing.unit}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setRestockingItem(ing)}
                            aria-label={`Restock ${ing.name}`}
                            title={`Restock ${ing.name}`}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-warm-200 text-slate-500 hover:border-accent-300 hover:text-accent-700"
                          >
                            <PackagePlus size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingIngredient(ing)}
                            aria-label={`Edit ${ing.name}`}
                            title={`Edit ${ing.name}`}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-warm-200 text-slate-500 hover:border-accent-300 hover:text-accent-700"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-warm-200 bg-warm-50">
                  <td colSpan={2} className="px-4 py-3 text-right font-extrabold text-slate-700">
                    Total Cost of Goods
                  </td>
                  <td className="px-2 py-3 text-right font-black text-slate-900">
                    {formatKES(
                      ingredients.reduce((sum, ing) => sum + ing.totalCost, 0)
                    )}
                  </td>
                  <td colSpan={5}></td>
                </tr>
              </tfoot>
            </table>
            </div>
            )}
          </div>
        )}

        {tab === "vendors" && (
          <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
            {vendors.length === 0 ? (
              <p className="text-slate-400 font-semibold text-center py-12">
                No vendors yet — use &ldquo;Add Vendor&rdquo; to get started.
              </p>
            ) : (
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
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-warm-200">
              <h2 className="font-extrabold text-slate-900">
                Vendor Payment History
              </h2>
              <select
                value={historyVendorFilter}
                onChange={(e) => setHistoryVendorFilter(e.target.value)}
                className="rounded-full border border-warm-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-600 outline-none focus:border-accent-400"
              >
                <option value="">All Vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            {paymentHistory.length === 0 ? (
              <p className="text-slate-400 font-semibold text-center py-12">
                No vendor payments recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-2 py-3">Vendor</th>
                      <th className="text-left px-2 py-3">Method</th>
                      <th className="text-left px-2 py-3">Reference</th>
                      <th className="text-right px-4 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((p) => {
                      const vendorName =
                        vendors.find((v) => v.id === p.vendorId)?.name ??
                        "Unknown vendor";
                      return (
                        <tr key={p.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 text-slate-600 font-semibold whitespace-nowrap">
                            {formatPaymentDate(p.paidAt)}
                          </td>
                          <td className="px-2 py-3 font-bold text-slate-900">
                            {vendorName}
                          </td>
                          <td className="px-2 py-3 text-slate-700 font-semibold">
                            {p.method === "mpesa" ? "M-Pesa" : "Cash"}
                          </td>
                          <td className="px-2 py-3 text-slate-600 font-semibold">
                            {p.reference || "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                            {formatKES(p.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-warm-200 bg-warm-50">
                      <td colSpan={4} className="px-4 py-3 text-right font-extrabold text-slate-700">
                        Total Paid
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900">
                        {formatKES(
                          paymentHistory.reduce((sum, p) => sum + p.amount, 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {showAddModal && (
        <AddIngredientModal onClose={() => setShowAddModal(false)} />
      )}
      {editingIngredient && (
        <AddIngredientModal
          item={editingIngredient}
          onClose={() => setEditingIngredient(null)}
        />
      )}
      {restockingItem && (
        <RestockModal
          item={restockingItem}
          onClose={() => setRestockingItem(null)}
        />
      )}
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
