"use client";

import Link from "next/link";
import clsx from "clsx";
import { Smartphone, CreditCard, Banknote, ArrowRight } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES, tableLabel } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/types";

const METHOD_META: Record<
  PaymentMethod,
  { label: string; icon: typeof Smartphone }
> = {
  mpesa: { label: "M-Pesa", icon: Smartphone },
  card: { label: "Card", icon: CreditCard },
  cash: { label: "Cash", icon: Banknote },
};

export default function CashierPage() {
  const tables = usePosStore((s) => s.tables);
  const orders = usePosStore((s) => s.orders);
  const staff = usePosStore((s) => s.staff);
  const payments = usePosStore((s) => s.payments);

  const queue = tables
    .map((table) => ({ table, order: orders[table.id] }))
    .filter(
      ({ order }) =>
        order?.billTotals && order.paymentStatus !== "paid"
    );

  const today = new Date().toDateString();
  const todaysPayments = payments.filter(
    (p) => new Date(p.paidAt).toDateString() === today
  );
  const totalToday = todaysPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 flex items-center px-6 border-b border-warm-200 bg-white">
        <h1 className="text-xl font-black text-slate-900">Cashier</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="rounded-xl border border-warm-200 bg-white p-5">
          <h2 className="font-extrabold text-slate-900 mb-3">
            Today&rsquo;s Collections
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-accent-50 border border-accent-100 px-3 py-3 text-center">
              <div className="text-[11px] font-extrabold text-accent-700 uppercase">
                Total
              </div>
              <div className="text-lg font-black text-slate-900">
                {formatKES(totalToday)}
              </div>
            </div>
            {(["mpesa", "card", "cash"] as PaymentMethod[]).map((m) => {
              const total = todaysPayments
                .filter((p) => p.method === m)
                .reduce((sum, p) => sum + p.amount, 0);
              const Icon = METHOD_META[m].icon;
              return (
                <div
                  key={m}
                  className="rounded-lg bg-warm-50 border border-warm-200 px-3 py-3 text-center"
                >
                  <div className="flex items-center justify-center gap-1 text-[11px] font-extrabold text-slate-500 uppercase">
                    <Icon size={12} /> {METHOD_META[m].label}
                  </div>
                  <div className="text-lg font-black text-slate-900">
                    {formatKES(total)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-warm-200">
            <h2 className="font-extrabold text-slate-900">
              Tables Awaiting Payment ({queue.length})
            </h2>
          </div>
          {queue.length === 0 ? (
            <p className="text-slate-400 font-semibold text-center py-12">
              No tables currently need a bill.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Table</th>
                  <th className="text-left px-2 py-3">Waiter</th>
                  <th className="text-right px-2 py-3">Total</th>
                  <th className="text-right px-2 py-3">Paid</th>
                  <th className="text-right px-2 py-3">Balance</th>
                  <th className="text-center px-2 py-3">Status</th>
                  <th className="text-right px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {queue.map(({ table, order }) => {
                  const total = order!.billTotals!.total;
                  const paid = payments
                    .filter((p) => p.orderId === order!.id)
                    .reduce((sum, p) => sum + p.amount, 0);
                  const balance = Math.max(0, total - paid);
                  const waiter = staff.find((m) => m.id === order!.waiterId);
                  return (
                    <tr key={table.id} className="border-t border-warm-100">
                      <td className="px-5 py-3 font-bold text-slate-900">
                        {tableLabel(table)}
                      </td>
                      <td className="px-2 py-3 text-slate-600 font-semibold">
                        {waiter?.name ?? "—"}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-700">
                        {formatKES(total)}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-700">
                        {formatKES(paid)}
                      </td>
                      <td className="px-2 py-3 text-right font-extrabold text-slate-900">
                        {formatKES(balance)}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex justify-center">
                          <span
                            className={clsx(
                              "rounded-full text-[11px] font-extrabold px-2.5 py-1 text-white",
                              order!.paymentStatus === "partially_paid"
                                ? "bg-status-needsbill"
                                : "bg-slate-400"
                            )}
                          >
                            {order!.paymentStatus === "partially_paid"
                              ? "Partially Paid"
                              : "Unpaid"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/billing/${table.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-accent-600 hover:bg-accent-700 text-white text-xs font-extrabold px-3.5 py-2"
                        >
                          Collect Payment <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
