"use client";

import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Plus } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import { AddIngredientModal } from "@/components/inventory/AddIngredientModal";

type Tab = "stock" | "vendors";

const TABS: { id: Tab; label: string }[] = [
  { id: "stock", label: "Stock" },
  { id: "vendors", label: "Vendors" },
];

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>("stock");
  const [showAddModal, setShowAddModal] = useState(false);
  const ingredients = usePosStore((s) => s.ingredients);
  const vendors = usePosStore((s) => s.vendors);

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 flex items-center justify-between px-6 border-b border-warm-200 bg-white">
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
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {tab === "stock" && (
          <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Item</th>
                  <th className="text-left px-2 py-3">Packaging</th>
                  <th className="text-right px-2 py-3">Amount</th>
                  <th className="text-right px-2 py-3">Quantity</th>
                  <th className="text-right px-2 py-3">Piece</th>
                  <th className="text-right px-2 py-3">Unit Cost</th>
                  <th className="text-left px-4 py-3">Unit</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing) => {
                  const low = ing.quantity <= ing.reorderThreshold;
                  return (
                    <tr key={ing.id} className="border-t border-warm-100">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <span className="flex items-center gap-1.5">
                          {low && (
                            <AlertTriangle
                              size={13}
                              className="text-status-needsbill shrink-0"
                              aria-label="Low stock — reorder soon"
                            />
                          )}
                          {ing.name}
                        </span>
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
                      <td className="px-4 py-3 text-slate-500 font-semibold">
                        {ing.unit}
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
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {tab === "vendors" && (
          <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Vendor</th>
                  <th className="text-left px-2 py-3">Category</th>
                  <th className="text-center px-2 py-3">Payment Method</th>
                  <th className="text-right px-2 py-3">Last Payment</th>
                  <th className="text-right px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {v.name}
                    </td>
                    <td className="px-2 py-3 text-slate-600 font-semibold">
                      {v.category}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-center">
                        <span
                          className={clsx(
                            "rounded-full text-[11px] font-extrabold px-2.5 py-1 text-white",
                            v.paymentMethod === "mpesa"
                              ? "bg-status-occupied"
                              : "bg-status-free"
                          )}
                        >
                          {v.paymentMethod === "mpesa" ? "M-Pesa" : "Cash"}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right font-semibold text-slate-700">
                      {formatKES(v.lastPaymentAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 font-semibold">
                      {v.lastPaymentDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showAddModal && (
        <AddIngredientModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
