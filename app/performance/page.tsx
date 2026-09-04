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
  Calendar,
} from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import { salesInRange } from "@/lib/payroll";
import { ordersCompletedInRange, priorityUnitsSoldInRange } from "@/lib/performance";
import { avatarColorFor, initials } from "@/components/tickets/ticketStatus";

type ViewMode = "cards" | "list";

function toDateInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function PerformanceTrackerPage() {
  const staff = usePosStore((s) => s.staff);
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const tickets = usePosStore((s) => s.tickets);
  const payments = usePosStore((s) => s.payments);
  const receipts = usePosStore((s) => s.receipts);
  const menu = usePosStore((s) => s.menu);

  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const todayStr = toDateInputValue(new Date());
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);

  const rangeStart = new Date(`${fromDate}T00:00:00`);
  const rangeEndInput = new Date(`${toDate}T23:59:59.999`);
  // If "to" ends up before "from" (e.g. mid-edit), just treat it as a
  // single-day range on "from" rather than showing an empty/negative range.
  const rangeEnd =
    rangeEndInput < rangeStart
      ? new Date(
          rangeStart.getFullYear(),
          rangeStart.getMonth(),
          rangeStart.getDate(),
          23, 59, 59, 999
        )
      : rangeEndInput;
  const isSingleDay = fromDate === toDate;
  const rangeLabel = isSingleDay
    ? rangeStart.toLocaleDateString("en-KE", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : `${rangeStart.toLocaleDateString("en-KE", { month: "long", day: "numeric" })} – ${rangeEnd.toLocaleDateString("en-KE", { month: "long", day: "numeric", year: "numeric" })}`;
  // Same-length window immediately before the selected range, so the
  // List view's trend arrows compare "this period" to "the one before it"
  // instead of always assuming a single day vs. yesterday.
  const rangeLengthMs = rangeEnd.getTime() - rangeStart.getTime();
  const previousRangeEnd = new Date(rangeStart.getTime() - 1);
  const previousRangeStart = new Date(previousRangeEnd.getTime() - rangeLengthMs);

  const currentStaff = staff.find((m) => m.id === currentStaffId);
  const allWaiters = staff.filter((m) => m.role === "Waiter");
  // A waiter only ever sees their own card here — never a colleague's
  // numbers. Admins (the only other role with access) see everyone.
  const waiters =
    currentStaff?.role === "Waiter"
      ? allWaiters.filter((m) => m.id === currentStaff.id)
      : allWaiters;

  // Shared stats for the List view (sorted by sales) — the Cards view
  // above keeps its own inline computation and staff-array order
  // untouched, per the request to leave it exactly as it was.
  const listRows = waiters
    .map((waiter) => ({
      waiter,
      orders: ordersCompletedInRange(tickets, waiter.id, rangeStart, rangeEnd),
      ordersPrevious: ordersCompletedInRange(
        tickets, waiter.id, previousRangeStart, previousRangeEnd
      ),
      sales: salesInRange(payments, waiter.id, rangeStart, rangeEnd),
      priorityTallies: priorityUnitsSoldInRange(
        receipts, tickets, menu, waiter.id, rangeStart, rangeEnd
      ),
    }))
    .sort((a, b) => b.sales - a.sales);
  const avgSales =
    listRows.length > 0
      ? listRows.reduce((sum, r) => sum + r.sales, 0) / listRows.length
      : 0;
  // Reused by the Cards view below to badge #1/#2/#3 without touching that
  // view's own untouched staff-array order.
  const salesRankById = new Map(
    listRows.map((row, i) => [row.waiter.id, i + 1])
  );

  return (
    <div className="flex-1 flex flex-col lg:h-full lg:overflow-hidden">
      <header className="shrink-0 min-h-16 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3 border-b border-warm-200 bg-white">
        <h1 className="text-xl font-black text-slate-900">
          {currentStaff?.role === "Waiter"
            ? "My Performance"
            : "Performance Tracker"}
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 rounded-full border border-warm-200 bg-white px-3 py-2">
              <Calendar size={14} className="text-accent-600 shrink-0" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs font-extrabold text-accent-700 outline-none bg-transparent"
              />
            </label>
            <span className="text-xs font-extrabold text-slate-400">to</span>
            <label className="flex items-center gap-2 rounded-full border border-warm-200 bg-white px-3 py-2">
              <Calendar size={14} className="text-accent-600 shrink-0" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs font-extrabold text-accent-700 outline-none bg-transparent"
              />
            </label>
          </div>
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
        </div>
      </header>

      <main className="flex-1 lg:min-h-0 overflow-y-auto p-6 space-y-6">
        <p className="text-sm font-bold text-slate-500">{rangeLabel}</p>

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
                    const orderDelta = row.orders - row.ordersPrevious;
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
                                    Top
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-semibold text-slate-400">
                                {hasActivity
                                  ? "Active this period"
                                  : "No orders in this period"}
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
                                vs {row.ordersPrevious} prior period
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
              const orders = ordersCompletedInRange(tickets, waiter.id, rangeStart, rangeEnd);
              const sales = salesInRange(payments, waiter.id, rangeStart, rangeEnd);
              const priorityTallies = priorityUnitsSoldInRange(
                receipts,
                tickets,
                menu,
                waiter.id,
                rangeStart,
                rangeEnd
              );
              // Rank is computed from the selected range's sales across all
              // waiters, but the cards themselves keep the original
              // staff-array order — only the badge reflects standing,
              // nothing gets reordered.
              const rank = salesRankById.get(waiter.id);
              const showRankBadge = rank !== undefined && rank <= 3 && sales > 0;

              return (
                <div
                  key={waiter.id}
                  className="relative rounded-2xl border border-warm-200 bg-white shadow-sm overflow-hidden"
                >
                  {showRankBadge && (
                    <span
                      className={clsx(
                        "absolute top-3 right-3 h-6 w-6 flex items-center justify-center rounded-full text-xs font-black text-white",
                        rank === 1
                          ? "bg-amber-400"
                          : rank === 2
                          ? "bg-slate-400"
                          : "bg-orange-400"
                      )}
                      aria-label={`Ranked #${rank} in sales for this period`}
                      title={`#${rank} in sales for this period`}
                    >
                      {rank}
                    </span>
                  )}
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
