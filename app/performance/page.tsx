"use client";

import { Trophy, ClipboardCheck, Wallet, Star } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import { salesToday } from "@/lib/payroll";
import { ordersCompletedToday, priorityUnitsSoldToday } from "@/lib/performance";

export default function PerformanceTrackerPage() {
  const staff = usePosStore((s) => s.staff);
  const tickets = usePosStore((s) => s.tickets);
  const payments = usePosStore((s) => s.payments);
  const receipts = usePosStore((s) => s.receipts);
  const menu = usePosStore((s) => s.menu);

  const waiters = staff.filter((m) => m.role === "Waiter");

  const today = new Date().toLocaleDateString("en-KE", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 flex items-center px-6 border-b border-warm-200 bg-white">
        <h1 className="text-xl font-black text-slate-900">
          Performance Tracker
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <p className="text-sm font-bold text-slate-500">{today}</p>

        {waiters.length === 0 ? (
          <p className="text-slate-400 font-semibold text-center py-16">
            No waiters on file yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {waiters.map((waiter) => {
              const orders = ordersCompletedToday(tickets, waiter.id);
              const sales = salesToday(payments, waiter.id);
              const priorityTallies = priorityUnitsSoldToday(
                receipts,
                tickets,
                menu,
                waiter.id
              );

              return (
                <div
                  key={waiter.id}
                  className="rounded-2xl border border-warm-200 bg-white shadow-sm overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-warm-200">
                    <Trophy size={16} className="text-accent-600" />
                    <span className="font-extrabold text-slate-900">
                      {waiter.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 px-4 py-3">
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                        <ClipboardCheck size={12} /> Orders Completed
                      </div>
                      <div className="text-xl font-black text-slate-900">
                        {orders}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                        <Wallet size={12} /> Total Sales
                      </div>
                      <div className="text-xl font-black text-slate-900">
                        {formatKES(sales)}
                      </div>
                    </div>
                  </div>

                  {priorityTallies.length > 0 && (
                    <div className="px-4 py-3 border-t border-warm-200 bg-warm-50">
                      <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-1.5">
                        <Star size={12} className="text-amber-500" /> Priority
                        Products Sold
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {priorityTallies.map((t) => (
                          <span
                            key={t.name}
                            className="rounded-full bg-white border border-warm-200 text-xs font-bold text-slate-700 px-2.5 py-1"
                          >
                            {t.name} ×{t.qty}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
