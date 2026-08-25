"use client";

import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES } from "@/lib/utils";

type Tab = "stock" | "vendors" | "recipes";

const TABS: { id: Tab; label: string }[] = [
  { id: "stock", label: "Stock" },
  { id: "vendors", label: "Vendors" },
  { id: "recipes", label: "Recipe Costing" },
];

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>("stock");
  const ingredients = usePosStore((s) => s.ingredients);
  const vendors = usePosStore((s) => s.vendors);
  const recipes = usePosStore((s) => s.recipes);

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white">
        <h1 className="text-xl font-black text-slate-900">Inventory</h1>
        <div className="flex rounded-full border border-slate-200 p-0.5">
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
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {tab === "stock" && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Ingredient</th>
                  <th className="text-right px-2 py-3">Stock</th>
                  <th className="text-right px-2 py-3">Reorder At</th>
                  <th className="text-right px-2 py-3">Unit Cost</th>
                  <th className="text-center px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing) => {
                  const low = ing.stock <= ing.reorderThreshold;
                  return (
                    <tr key={ing.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {ing.name}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-700">
                        {ing.stock} {ing.unit}
                      </td>
                      <td className="px-2 py-3 text-right text-slate-500 font-semibold">
                        {ing.reorderThreshold} {ing.unit}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-700">
                        {formatKES(ing.unitCost)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          {low ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-status-needsbill text-white text-[11px] font-extrabold px-2.5 py-1">
                              <AlertTriangle size={12} /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-status-free text-white text-[11px] font-extrabold px-2.5 py-1">
                              OK
                            </span>
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

        {tab === "vendors" && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
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

        {tab === "recipes" && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Dish</th>
                  <th className="text-left px-2 py-3">Ingredients</th>
                  <th className="text-right px-2 py-3">Food Cost</th>
                  <th className="text-right px-2 py-3">Menu Price</th>
                  <th className="text-right px-4 py-3">Margin</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((r) => {
                  const foodCost = r.components.reduce((sum, c) => {
                    const ing = ingredients.find((i) => i.id === c.ingredientId);
                    return sum + (ing ? ing.unitCost * c.qty : 0);
                  }, 0);
                  const margin = ((r.menuPrice - foodCost) / r.menuPrice) * 100;
                  return (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {r.dishName}
                      </td>
                      <td className="px-2 py-3 text-slate-500 font-semibold text-xs">
                        {r.components
                          .map((c) => {
                            const ing = ingredients.find(
                              (i) => i.id === c.ingredientId
                            );
                            return ing ? `${ing.name} (${c.qty}${ing.unit})` : "";
                          })
                          .join(", ")}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-700">
                        {formatKES(Math.round(foodCost))}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-700">
                        {formatKES(r.menuPrice)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={clsx(
                            "font-extrabold",
                            margin >= 50
                              ? "text-status-free"
                              : margin >= 30
                              ? "text-status-needsbill"
                              : "text-rose-600"
                          )}
                        >
                          {margin.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
