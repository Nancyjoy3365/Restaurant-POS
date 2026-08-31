"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  Trophy,
  ClipboardCheck,
  Wallet,
  Star,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import { salesToday } from "@/lib/payroll";
import { ordersCompletedToday, priorityUnitsSoldToday } from "@/lib/performance";
import { avatarColorFor, initials } from "@/components/tickets/ticketStatus";

type ViewMode = "cards" | "list";

export default function PerformanceTrackerPage() {
  const staff = usePosStore((s) => s.staff);
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const tickets = usePosStore((s) => s.tickets);
  const payments = usePosStore((s) => s.payments);
  const receipts = usePosStore((s) => s.receipts);
  const menu = usePosStore((s) => s.menu);

  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const currentStaff = staff.find((m) => m.id === currentStaffId);
  const allWaiters = staff.filter((m) => m.role === "Waiter");
  // A waiter only ever sees their own card here — never a colleague's
  // numbers. Admins (the only other role with access) see everyone.
  const waiters =
    currentStaff?.role === "Waiter"
      ? allWaiters.filter((m) => m.id === currentStaff.id)
      : allWaiters;

  const today = new Date().toLocaleDateString("en-KE", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Shared stats for the List view (sorted by sales) — the Cards view
  // above keeps its own inline computation and staff-array order
  // untouched, per the request to leave it exactly as it was.
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const listRows = waiters
    .map((waiter) => ({
      waiter,
      orders: ordersCompletedToday(tickets, waiter.id),
      ordersYesterday: ordersCompletedToday(tickets, waiter.id, yesterday),
      sales: salesToday(payments, waiter.id),
      priorityTallies: priorityUnitsSoldToday(receipts, tickets, menu, waiter.id),
    }))
    .sort((a, b) => b.sales - a.sales);
  const avgSales =
    listRows.length > 0
      ? listRows.reduce((sum, r) => sum + r.sales, 0) / listRows.length
      : 0;

  return (
    <div className="flex-1 flex flex-col">
      <header className="min-h-16 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3 border-b border-warm-200 bg-white">
        <h1 className="text-xl font-black text-slate-900">
          {currentStaff?.role === "Waiter"
            ? "My Performance"
            : "Performance Tracker"}
        </h1>
        {waiters.length > 1 && (
          <div className="flex items-center gap-1 rounded-full bg-warm-50 border border-warm-200 p-1">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={clsx(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors",
                viewMode === "cards"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              )}
            >
              <LayoutGrid size={13} /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={clsx(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors",
                viewMode === "list"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500"
              )}
            >
              <ListIcon size={13} /> List
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <p className="text-sm font-bold text-slate-500">{today}</p>

        {waiters.length === 0 ? (
          <p className="text-slate-400 font-semibold text-center py-16">
            No waiters on file yet.
          </p>
        ) : viewMode === "list" ? (
          <div className="rounded-2xl border border-warm-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 w-10">#</th>
                    <th className="text-left px-2 py-3">Waiter</th>
                    <th className="text-left px-2 py-3">Orders</th>
                    <th className="text-left px-2 py-3">Total Sales</th>
                    <th className="text-left px-2 py-3">Priority Products</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {listRows.map((row, i) => {
                    const rank = i + 1;
                    const isTop = rank === 1 && row.sales > 0;
                    const hasActivity = row.orders > 0;
                    const orderDelta = row.orders - row.ordersYesterday;
                    const salesDeltaPct =
                      avgSales > 0 ? ((row.sales - avgSales) / avgSales) * 100 : 0;

                    return (
                      <tr
                        key={row.waiter.id}
                        className={clsx(
                          "border-t border-warm-100",
                          isTop && "bg-accent-50/60"
                        )}
                      >
                        <td className="px-4 py-3">
                          {isTop ? (
                            <Trophy size={16} className="text-amber-500" />
                          ) : (
                            <span className="text-slate-400 font-bold">
                              {rank}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={clsx(
                                "h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-white font-black text-xs",
                                avatarColorFor(row.waiter.id)
                              )}
                            >
                              {initials(row.waiter.name)}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900 truncate">
                                  {row.waiter.name}
                                </span>
                                {isTop && (
                                  <span className="rounded-full bg-slate-900 text-white text-[10px] font-extrabold px-2 py-0.5 uppercase tracking-wide whitespace-nowrap">
                                    Top Today
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-semibold text-slate-400">
                                {hasActivity
                                  ? "On shift"
                                  : "No orders yet today"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          {hasActivity ? (
                            <>
                              <div className="font-extrabold text-slate-900">
                                {row.orders}
                              </div>
                              <div
                                className={clsx(
                                  "flex items-center gap-0.5 text-[11px] font-bold",
                                  orderDelta > 0
                                    ? "text-status-free"
                                    : orderDelta < 0
                                    ? "text-rose-600"
                                    : "text-slate-400"
                                )}
                              >
                                {orderDelta > 0 ? (
                                  <ArrowUp size={11} />
                                ) : orderDelta < 0 ? (
                                  <ArrowDown size={11} />
                                ) : null}
                                vs {row.ordersYesterday} yesterday
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-300 font-bold">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          {hasActivity ? (
                            <>
                              <div className="font-extrabold text-slate-900">
                                {formatKES(row.sales)}
                              </div>
                              {avgSales > 0 && (
                                <div
                                  className={clsx(
                                    "flex items-center gap-0.5 text-[11px] font-bold",
                                    salesDeltaPct > 0
                                      ? "text-status-free"
                                      : salesDeltaPct < 0
                                      ? "text-rose-600"
                                      : "text-slate-400"
                                  )}
                                >
                                  {salesDeltaPct > 0 ? (
                                    <ArrowUp size={11} />
                                  ) : salesDeltaPct < 0 ? (
                                    <ArrowDown size={11} />
                                  ) : null}
                                  {Math.abs(salesDeltaPct).toFixed(0)}% vs avg
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-300 font-bold">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          {row.priorityTallies.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {row.priorityTallies.map((t) => (
                                <span
                                  key={t.name}
                                  className="rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-2.5 py-1 whitespace-nowrap"
                                >
                                  {t.name} ×{t.qty}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs font-semibold">
                              No sales yet
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setViewMode("cards")}
                            className="rounded-full border-2 border-accent-600 text-accent-700 hover:bg-accent-50 text-xs font-extrabold px-3.5 py-1.5"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
