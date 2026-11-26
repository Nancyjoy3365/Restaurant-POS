"use client";

import clsx from "clsx";
import { TrendingUp } from "lucide-react";
import type { Ticket } from "@/lib/types";
import {
  monthWeekReport,
  ordersCompletedInRange,
  type MonthWeekRow,
  type PeriodRange,
} from "@/lib/performance";
import { avatarColorFor, initials } from "@/components/tickets/ticketStatus";

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

function monthShort(d: Date): string {
  return d.toLocaleDateString("en-KE", { month: "short" });
}

// "1st – 11th Nov", or "22nd Oct – 4th Nov" when the range crosses months.
function rangeText(r: PeriodRange): string {
  const sameMonth =
    r.start.getMonth() === r.end.getMonth() && r.start.getFullYear() === r.end.getFullYear();
  return sameMonth
    ? `${ordinal(r.start.getDate())} – ${ordinal(r.end.getDate())} ${monthShort(r.end)}`
    : `${ordinal(r.start.getDate())} ${monthShort(r.start)} – ${ordinal(r.end.getDate())} ${monthShort(r.end)}`;
}

function formatGrowth(n: number): string {
  return `${n > 0 ? "+" : ""}${n}`;
}

function formatPct(pct: number | null, change: number): string {
  if (pct === null) return change > 0 ? "new" : "—";
  const rounded = Math.round(pct);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function growthClass(n: number): string {
  return n > 0 ? "text-status-free" : n < 0 ? "text-rose-600" : "text-slate-400";
}

type Figures = Omit<MonthWeekRow, "waiterId" | "name">;

function FigureCells({ f, bold = false }: { f: Figures; bold?: boolean }) {
  const num = clsx("px-3 py-3 text-right tabular-nums", bold ? "font-black" : "font-bold");
  return (
    <>
      <td className={clsx(num, "text-slate-500")}>{f.lastMonth}</td>
      <td className={clsx(num, "text-slate-900")}>{f.monthToDate}</td>
      <td className={clsx(num, growthClass(f.momGrowth))}>{formatGrowth(f.momGrowth)}</td>
      <td className={clsx(num, growthClass(f.momGrowth))}>{formatPct(f.momPct, f.momGrowth)}</td>
      <td className="w-4 border-l border-warm-200" aria-hidden />
      <td className={clsx(num, "text-slate-500")}>{f.previousWeek}</td>
      <td className={clsx(num, "text-slate-700")}>{f.lastWeek}</td>
      <td className={clsx(num, "text-slate-900")}>{f.currentWeek}</td>
      <td className={clsx(num, growthClass(f.wowGrowth))}>{formatGrowth(f.wowGrowth)}</td>
      <td className={clsx(num, growthClass(f.wowGrowth))}>{formatPct(f.wowPct, f.wowGrowth)}</td>
    </>
  );
}

// The month/week columns are always measured from today and define their own
// fixed periods. The "Selected Dates" column is the exception: it counts
// orders across whatever range the Performance Tracker's date filter is set
// to, whether that's one day, a few days, a week or several months.
export default function WeekOnWeekReport({
  tickets,
  waiters,
  rangeStart,
  rangeEnd,
}: {
  tickets: Ticket[];
  waiters: { id: string; name: string }[];
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const report = monthWeekReport(tickets, waiters, new Date());
  const { rows, totals } = report;
  const selectedById = new Map(
    waiters.map((w) => [w.id, ordersCompletedInRange(tickets, w.id, rangeStart, rangeEnd)])
  );
  const selectedTotal = [...selectedById.values()].reduce((s, n) => s + n, 0);
  const selectedSub =
    rangeStart.toDateString() === rangeEnd.toDateString()
      ? `${ordinal(rangeStart.getDate())} ${monthShort(rangeStart)}`
      : rangeText({ start: rangeStart, end: rangeEnd, days: 0 });
  const selectedCell = "px-3 py-3 text-right tabular-nums bg-accent-50/40 border-r border-warm-200";
  const mostImproved = rows.filter((r) => r.wowGrowth > 0).slice(0, 3);

  const columns: { label: string; sub?: string; muted?: boolean }[] = [
    { label: "Last Month", sub: report.lastMonth.start.toLocaleDateString("en-KE", { month: "long" }), muted: true },
    { label: "Month to Date", sub: rangeText(report.monthToDate) },
    { label: "MoM Growth" },
    { label: "% MoM" },
  ];
  const weekColumns: { label: string; sub?: string; muted?: boolean }[] = [
    { label: "Previous Week", sub: rangeText(report.previousWeek), muted: true },
    { label: "Last Week", sub: rangeText(report.lastWeek) },
    {
      label: "Current Week",
      sub: `${rangeText(report.currentWeek)} (${report.currentWeek.days}d)`,
    },
    { label: "WoW Growth" },
    { label: "% WoW" },
  ];

  const headCell = (c: { label: string; sub?: string; muted?: boolean }) => (
    <th
      key={c.label}
      className={clsx(
        "text-right px-3 py-3 whitespace-nowrap align-top",
        c.muted && "text-slate-400"
      )}
    >
      {c.label}
      <div className="normal-case font-bold tracking-normal text-slate-400 min-h-4">
        {c.sub ?? ""}
      </div>
    </th>
  );

  return (
    <section className="space-y-4 pt-2">
      <div>
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <TrendingUp size={18} className="text-accent-600" /> Month &amp; Week Growth
        </h2>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">
          Orders completed · weeks run 1st–7th, 8th–14th, 15th–21st and 22nd–month end ·
          ranked by most improved week on week
        </p>
      </div>

      {mostImproved.length === 0 && rows.length > 0 && (
        <div className="rounded-2xl border border-warm-200 bg-white px-4 py-3 text-sm font-bold text-slate-500">
          No waiter has completed more orders this week than last week yet, so there&apos;s no
          most improved for this period.
        </div>
      )}

      {mostImproved.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {mostImproved.map((r, i) => (
            <div
              key={r.waiterId}
              className={clsx(
                "rounded-2xl border px-4 py-3 flex items-center gap-3",
                i === 0 ? "border-amber-300 bg-amber-50" : "border-warm-200 bg-white"
              )}
            >
              <span
                className={clsx(
                  "h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-white font-black text-xs",
                  avatarColorFor(r.waiterId)
                )}
              >
                {initials(r.name)}
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                  {i === 0 ? "Most improved" : `#${i + 1} most improved`}
                </div>
                <div className="font-extrabold text-slate-900 truncate">{r.name}</div>
                <div className={clsx("text-xs font-bold", growthClass(r.wowGrowth))}>
                  {formatGrowth(r.wowGrowth)} orders ({formatPct(r.wowPct, r.wowGrowth)}) ·{" "}
                  {r.lastWeek} → {r.currentWeek}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-slate-400 font-semibold text-center py-8">No waiters on file yet.</p>
      ) : (
        <div className="rounded-2xl border border-warm-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold">
                <tr>
                  <th className="text-left px-4 py-3 w-10 align-top">#</th>
                  <th className="text-left px-2 py-3 align-top">Waiter</th>
                  <th className="text-right px-3 py-3 whitespace-nowrap align-top text-slate-900 bg-accent-50/40 border-r border-warm-200">
                    Selected Dates
                    <div className="normal-case font-bold tracking-normal text-slate-400 min-h-4">
                      {selectedSub}
                    </div>
                  </th>
                  {columns.map(headCell)}
                  <th className="w-4 border-l border-warm-200" aria-hidden />
                  {weekColumns.map(headCell)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.waiterId}
                    className={clsx(
                      "border-t border-warm-100",
                      i === 0 && r.wowGrowth > 0 && "bg-accent-50/60"
                    )}
                  >
                    <td className="px-4 py-3 text-slate-400 font-bold">{i + 1}</td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={clsx(
                            "h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-white font-black text-[10px]",
                            avatarColorFor(r.waiterId)
                          )}
                        >
                          {initials(r.name)}
                        </span>
                        <span className="font-extrabold text-slate-900 whitespace-nowrap">
                          {r.name}
                        </span>
                      </div>
                    </td>
                    <td className={clsx(selectedCell, "font-black text-slate-900")}>
                      {selectedById.get(r.waiterId) ?? 0}
                    </td>
                    <FigureCells f={r} />
                  </tr>
                ))}
                <tr className="border-t-2 border-warm-200 bg-warm-50">
                  <td className="px-4 py-3" />
                  <td className="px-2 py-3 font-black text-slate-900">Total</td>
                  <td className={clsx(selectedCell, "font-black text-slate-900")}>
                    {selectedTotal}
                  </td>
                  <FigureCells f={totals} bold />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
