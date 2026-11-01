"use client";

import { AlertTriangle } from "lucide-react";
import { formatKES } from "@/lib/utils";
import type { WaiterSalesRow } from "@/lib/reports";

export function WaiterSalesTable({ rows }: { rows: WaiterSalesRow[] }) {
  const totals = rows.reduce(
    (sum, r) => ({
      orders: sum.orders + r.orders,
      mpesa: sum.mpesa + r.mpesa,
      cash: sum.cash + r.cash,
      total: sum.total + r.total,
    }),
    { orders: 0, mpesa: 0, cash: 0, total: 0 }
  );

  return (
    <div className="rounded-xl border border-warm-200 bg-white p-5">
      <div className="overflow-x-auto rounded-lg border border-warm-200">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Waiter</th>
              <th className="text-right px-3 py-3 w-24">Orders</th>
              <th className="text-right px-3 py-3 w-32">M-Pesa</th>
              <th className="text-right px-3 py-3 w-32">Cash</th>
              <th className="text-right px-4 py-3 w-36">Total sales</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              // Payments recorded against this waiter's receipts should
              // equal what they billed — flag the row when they don't.
              const gap = row.total - (row.mpesa + row.cash);
              return (
                <tr key={row.waiterId || "unassigned"} className="border-t border-warm-100">
                  <td className="px-4 py-2.5 font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      {row.name}
                      {gap !== 0 && (
                        <span
                          className="text-amber-600"
                          title={
                            gap > 0
                              ? `${formatKES(gap)} billed but not matched to a payment`
                              : `${formatKES(-gap)} paid above the billed total`
                          }
                        >
                          <AlertTriangle size={13} />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-700 tabular-nums">
                    {row.orders}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-700 tabular-nums">
                    {row.mpesa > 0 ? formatKES(row.mpesa) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-700 tabular-nums">
                    {row.cash > 0 ? formatKES(row.cash) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-extrabold text-slate-900 tabular-nums">
                    {formatKES(row.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-warm-200 bg-warm-50 font-extrabold text-slate-900">
            <tr>
              <td className="px-4 py-3">Total</td>
              <td className="px-3 py-3 text-right tabular-nums">{totals.orders}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatKES(totals.mpesa)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatKES(totals.cash)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatKES(totals.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
