"use client";

import { X } from "lucide-react";
import clsx from "clsx";
import { usePosStore } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import type { Vendor } from "@/lib/types";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function VendorHistoryModal({
  vendor,
  onClose,
}: {
  vendor: Vendor;
  onClose: () => void;
}) {
  const ingredients = usePosStore((s) => s.ingredients);
  const stockPurchases = usePosStore((s) => s.stockPurchases);
  const vendorPayments = usePosStore((s) => s.vendorPayments);

  const purchases = stockPurchases
    .filter((p) => p.vendorId === vendor.id)
    .sort((a, b) => b.purchasedAt - a.purchasedAt);
  const payments = vendorPayments
    .filter((p) => p.vendorId === vendor.id)
    .sort((a, b) => b.paidAt - a.paidAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-slate-900">
            {vendor.name} — History
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5">
          <div>
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-2">
              Purchases ({purchases.length})
            </h4>
            {purchases.length === 0 ? (
              <p className="text-sm text-slate-400 font-semibold py-4 text-center">
                No purchases recorded from this vendor yet.
              </p>
            ) : (
              <div className="rounded-lg border border-warm-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-warm-50 text-slate-500 text-[11px] font-extrabold uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-3 py-2">Date</th>
                      <th className="text-left px-2 py-2">Item</th>
                      <th className="text-right px-2 py-2">Qty</th>
                      <th className="text-right px-2 py-2">Amount</th>
                      <th className="text-center px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p) => {
                      const ingredient = ingredients.find(
                        (i) => i.id === p.ingredientId
                      );
                      return (
                        <tr key={p.id} className="border-t border-warm-100">
                          <td className="px-3 py-2 text-slate-600 font-semibold whitespace-nowrap">
                            {formatDate(p.purchasedAt)}
                          </td>
                          <td className="px-2 py-2 font-bold text-slate-900">
                            {ingredient?.name ?? "Deleted item"}
                          </td>
                          <td className="px-2 py-2 text-right text-slate-700 font-semibold">
                            {p.quantity}
                          </td>
                          <td className="px-2 py-2 text-right font-extrabold text-slate-900">
                            {formatKES(p.totalCost)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={clsx(
                                "rounded-full text-[10px] font-extrabold px-2 py-0.5",
                                p.paid
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              )}
                            >
                              {p.paid ? "Paid" : "Unpaid"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-2">
              Payments ({payments.length})
            </h4>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-400 font-semibold py-4 text-center">
                No payouts recorded to this vendor yet.
              </p>
            ) : (
              <div className="rounded-lg border border-warm-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-warm-50 text-slate-500 text-[11px] font-extrabold uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-3 py-2">Date</th>
                      <th className="text-left px-2 py-2">Method</th>
                      <th className="text-left px-2 py-2">Reference</th>
                      <th className="text-right px-3 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-t border-warm-100">
                        <td className="px-3 py-2 text-slate-600 font-semibold whitespace-nowrap">
                          {formatDate(p.paidAt)}
                        </td>
                        <td className="px-2 py-2 text-slate-700 font-semibold">
                          {p.method === "mpesa" ? "M-Pesa" : "Cash"}
                        </td>
                        <td className="px-2 py-2 text-slate-600 font-semibold">
                          {p.reference || "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-extrabold text-slate-900">
                          {formatKES(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
