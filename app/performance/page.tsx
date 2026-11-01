"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  Trophy,
  ClipboardCheck,
  Star,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List as ListIcon,
  Calendar,
} from "lucide-react";
import { usePosStore } from "@/lib/store";
import { useAllTickets } from "@/lib/hooks/useOrders";
import { useReceipts } from "@/lib/hooks/useBilling";
import { useMenu } from "@/lib/hooks/useMenu";
import { useStaff } from "@/lib/hooks/useStaff";
import {
  ordersCompletedInRange,
  priorityUnitsSoldInRange,
  priorityUnitsSoldByCategoryInRange,
} from "@/lib/performance";
import { salesByWaiter } from "@/lib/reports";
import { avatarColorFor, initials } from "@/components/tickets/ticketStatus";

type ViewMode = "cards" | "list";

function toDateInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function PerformanceTrackerPage() {
  const { staff } = useStaff();
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const { tickets } = useAllTickets();
  const { menu } = useMenu();

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
  const { receipts } = useReceipts({ start: rangeStart, end: rangeEnd });
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

  // Ranked by sales, using the same completed-receipt figures as the
  // Financial Summary's Sales by Waiter (so duplicate taps or unverified
  // M-Pesa can't move anyone up). The amounts themselves deliberately live
  // only on the Financial Summary — here they only decide the order.
  const receiptsInRange = receipts.filter(
    (r) => r.issuedAt >= rangeStart.getTime() && r.issuedAt <= rangeEnd.getTime()
  );
  const salesById = new Map(
    salesByWaiter(receiptsInRange, tickets, staff).map((r) => [r.waiterId, r.total])
  );
  const listRows = waiters
    .map((waiter) => ({
      waiter,
      orders: ordersCompletedInRange(tickets, waiter.id, rangeStart, rangeEnd),
      ordersPrevious: ordersCompletedInRange(
        tickets, waiter.id, previousRangeStart, previousRangeEnd
      ),
      sales: salesById.get(waiter.id) ?? 0,
      priorityTallies: priorityUnitsSoldInRange(
        receipts, tickets, menu, waiter.id, rangeStart, rangeEnd
      ),
      priorityCategoryTallies: priorityUnitsSoldByCategoryInRange(
        receipts, tickets, menu, waiter.id, rangeStart, rangeEnd
      ),
    }))
    .sort((a, b) => b.sales - a.sales || b.orders - a.orders);
  // Reused by the Cards view below to badge #1/#2/#3.
  const rankById = new Map(
    listRows.map((row, i) => [row.waiter.id, i + 1])
  );
  // A waiter only ever sees their own card, so a rank would always read
  // "#1" — meaningless, so it's hidden for them.
  const isWaiterView = currentStaff?.role === "Waiter";

  return (
    <div className="flex-1 flex flex-col lg:h-full lg:overflow-hidden">
      <header className="sticky top-0 z-10 shrink-0 min-h-16 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3 border-b border-warm-200 bg-white">
        <h1 className="text-xl font-black text-slate-900">
          {currentStaff?.role === "Waiter"
            ? "My Performance"
            : "Performance Tracker"}
        </h1>
        <div className="flex items-center gap-3">
          {currentStaff?.role !== "Waiter" && (
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
          )}
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
        <p className="text-sm font-bold text-slate-500">
          {rangeLabel}
          {!isWaiterView && waiters.length > 1 && (
            <span className="text-slate-400"> · Ranked by sales</span>
          )}
        </p>

        {waiters.length === 0 ? (
          <p className="text-slate-400 font-semibold text-center py-16">
            No waiters on file yet.
          </p>
        ) : viewMode === "list" ? (
          <div className="rounded-2xl border border-warm-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
                <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 w-10">#</th>
                    <th className="text-left px-2 py-3">Waiter</th>
                    <th className="text-left px-2 py-3">Orders</th>
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
            {listRows.map(({ waiter, orders, sales, priorityCategoryTallies }) => {
              // Cards are ordered by the same standing the rank badge shows
              // (listRows is already sorted by sales, highest first) — the
              // leader's card always appears first, and the order shifts
              // live as performance changes instead of staying pinned to
              // the original staff-array order.
              const rank = rankById.get(waiter.id);
              const showRank = !isWaiterView && rank !== undefined && sales > 0;

              return (
                <div
                  key={waiter.id}
                  className="rounded-2xl border border-warm-200 bg-white shadow-sm overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-warm-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Trophy size={16} className="shrink-0 text-accent-600" />
                          <span className="font-extrabold text-slate-900 truncate">
                            {waiter.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-xs font-semibold text-slate-500">
                          <ClipboardCheck size={12} />
                          {orders} {orders === 1 ? "order" : "orders"} completed
                        </div>
                      </div>
                      {showRank && (
                        <span
                          className={clsx(
                            "shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-black whitespace-nowrap shadow-sm",
                            rank === 1
                              ? "bg-amber-400 text-white ring-2 ring-amber-200"
                              : rank === 2
                              ? "bg-slate-500 text-white ring-2 ring-slate-200"
                              : rank === 3
                              ? "bg-orange-500 text-white ring-2 ring-orange-200"
                              : "bg-warm-50 border border-warm-200 text-slate-600"
                          )}
                        >
                          {rank === 1 && <Trophy size={15} />}
                          #{rank} in sales
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Category totals, not a per-item breakdown, for every
                      viewer here — the List view/table below still keeps
                      the full per-item detail for Admin's deeper drill-down
                      (priorityTallies, untouched). */}
                  {priorityCategoryTallies.length > 0 && (
                    <div className="px-4 py-3 border-t border-warm-200 bg-warm-50">
                      <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-1.5">
                        <Star size={12} className="text-amber-500" /> Priority
                        Products Sold
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {priorityCategoryTallies.map((t) => (
                          <span
                            key={t.category}
                            className="rounded-full bg-white border border-warm-200 text-xs font-bold text-slate-700 px-2.5 py-1"
                          >
                            {t.category} ×{t.qty}
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
