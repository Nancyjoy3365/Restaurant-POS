"use client";

import clsx from "clsx";
import { ArrowDown, ArrowUp, Minus, TrendingUp } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { weekOnWeekReport } from "@/lib/performance";
import { avatarColorFor, initials } from "@/components/tickets/ticketStatus";

function shortDate(d: Date): string {
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

function rangeLabel(b: { start: Date; end: Date }): string {
  const startStr = shortDate(b.start);
  const endStr = shortDate(b.end);
  return startStr === endStr ? startStr : `${startStr} – ${endStr}`;
}

function formatPct(pct: number | null, change: number): string {
  if (pct === null) return change > 0 ? "new" : "—";
  const rounded = Math.round(pct);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function formatChange(change: number): string {
  return `${change > 0 ? "+" : ""}${change}`;
}

// The date range comes from the Performance Tracker's own filter at the top
// of the page, so the cards and this report always cover the same period.
export default function WeekOnWeekReport({
  tickets,
  waiters,
  start,
  end,
}: {
  tickets: Ticket[];
  waiters: { id: string; name: string }[];
  start: Date;
  end: Date;
}) {
  const { buckets, previousPeriod, inProgress, rows } = weekOnWeekReport(
    tickets,
    waiters,
    start,
    end
  );
  // Only someone who actually went up counts as "improved" — a smaller drop
  // than everyone else is still a drop.
  const mostImproved = rows.filter((r) => r.change > 0).slice(0, 3);
  const periodText = rangeLabel({ start, end });
  const previousText =
    rangeLabel(previousPeriod) +
    (inProgress
      ? ` (up to ${previousPeriod.end.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" })})`
      : "");

  return (
    <section className="space-y-4 pt-2">
      <div>
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <TrendingUp size={18} className="text-accent-600" /> Week-on-Week Report
        </h2>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">
          Orders completed per week · {periodText} compared with {previousText} · ranked by
          most improved
        </p>
      </div>

      {mostImproved.length === 0 && rows.length > 0 && (
        <div className="rounded-2xl border border-warm-200 bg-white px-4 py-3 text-sm font-bold text-slate-500">
          No waiter has completed more orders than in {previousText} yet, so there&apos;s no
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
                <div
                  className={clsx(
                    "text-xs font-bold",
                    r.change > 0
                      ? "text-status-free"
                      : r.change < 0
                      ? "text-rose-600"
                      : "text-slate-400"
                  )}
                >
                  {formatChange(r.change)} orders ({formatPct(r.changePct, r.change)}) ·{" "}
                  {r.previous} → {r.total}
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
              <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 w-10">#</th>
                  <th className="text-left px-2 py-3">Waiter</th>
                  {buckets.map((b) => (
                    <th key={b.start.getTime()} className="text-right px-2 py-3 whitespace-nowrap">
                      Week
                      <div className="normal-case font-bold tracking-normal text-slate-400">
                        {rangeLabel(b)}
                        {b.days < 7 && ` (${b.days}d)`}
                      </div>
                    </th>
                  ))}
                  <th className="text-right px-2 py-3 whitespace-nowrap">
                    Total
                    <div className="normal-case font-bold tracking-normal text-slate-400">
                      {periodText}
                    </div>
                  </th>
                  <th className="text-right px-2 py-3 whitespace-nowrap text-slate-400">
                    Previous
                    <div className="normal-case font-bold tracking-normal">{previousText}</div>
                  </th>
                  <th className="text-right px-4 py-3 whitespace-nowrap">Change</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.waiterId}
                    className={clsx("border-t border-warm-100", i === 0 && r.change > 0 && "bg-accent-50/60")}
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
                    {r.weekly.map((n, idx) => (
                      <td key={idx} className="px-2 py-3 text-right font-bold text-slate-700">
                        {n}
                      </td>
                    ))}
                    <td className="px-2 py-3 text-right font-black text-slate-900">{r.total}</td>
                    <td className="px-2 py-3 text-right font-bold text-slate-400">{r.previous}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span
                        className={clsx(
                          "inline-flex items-center gap-0.5 font-extrabold",
                          r.change > 0
                            ? "text-status-free"
                            : r.change < 0
                            ? "text-rose-600"
                            : "text-slate-400"
                        )}
                      >
                        {r.change > 0 ? (
                          <ArrowUp size={13} />
                        ) : r.change < 0 ? (
                          <ArrowDown size={13} />
                        ) : (
                          <Minus size={13} />
                        )}
                        {formatChange(r.change)}
                      </span>
                      <div className="text-[11px] font-bold text-slate-400">
                        {formatPct(r.changePct, r.change)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
