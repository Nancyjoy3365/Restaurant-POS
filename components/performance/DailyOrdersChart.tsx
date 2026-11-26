"use client";

import { BarChart3 } from "lucide-react";
import type { Ticket } from "@/lib/types";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Rounds the axis top up to a clean number so gridlines land on whole values.
function niceMax(n: number): number {
  if (n <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(n)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * step >= n) return m * step;
  }
  return 10 * step;
}

function formatAvg(n: number): string {
  return n >= 10 || n === 0 ? n.toFixed(0) : n.toFixed(1);
}

// Completed orders per day across the Performance Tracker's selected dates.
// When only a single day is picked, the chart widens to that day's whole
// month (up to today) so there's something to compare it against.
export default function DailyOrdersChart({
  tickets,
  waiters,
  rangeStart,
  rangeEnd,
}: {
  tickets: Ticket[];
  waiters: { id: string }[];
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const isSingleDay = rangeStart.toDateString() === rangeEnd.toDateString();
  let first = startOfDay(rangeStart);
  let last = startOfDay(rangeEnd);
  if (isSingleDay) {
    first = new Date(first.getFullYear(), first.getMonth(), 1);
    const monthEnd = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const today = startOfDay(new Date());
    last = monthEnd > today && today >= first ? today : monthEnd;
  }

  const days: Date[] = [];
  for (let d = first; d <= last; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    days.push(d);
  }

  const waiterIds = new Set(waiters.map((w) => w.id));
  const counts = new Map<number, number>();
  for (const t of tickets) {
    if (t.status !== "paid" || t.closedAt === undefined || !waiterIds.has(t.waiterId)) continue;
    const key = startOfDay(new Date(t.closedAt)).getTime();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const data = days.map((d) => ({ day: d, orders: counts.get(d.getTime()) ?? 0 }));
  const peak = Math.max(0, ...data.map((p) => p.orders));
  const top = niceMax(peak);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
  const total = data.reduce((s, p) => s + p.orders, 0);
  const average = data.length > 0 ? total / data.length : 0;
  const bestIndex = peak > 0 ? data.findIndex((p) => p.orders === peak) : -1;
  const selectedTime = startOfDay(rangeStart).getTime();
  const spansMonths =
    first.getMonth() !== last.getMonth() || first.getFullYear() !== last.getFullYear();
  // Thin out the x labels on long ranges so they don't collide.
  const labelEvery = data.length > 62 ? 10 : data.length > 31 ? 5 : data.length > 16 ? 3 : 1;
  const gap = data.length <= 16 ? "gap-1.5" : data.length <= 60 ? "gap-[3px]" : "gap-px";
  const plotHeight = "h-60 lg:h-72";

  const fmtDay = (d: Date) =>
    d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
  const subtitle = `${first.toLocaleDateString("en-KE", { day: "numeric", month: "short" })} – ${last.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}`;

  const stats: { label: string; value: string; sub?: string }[] = [
    { label: "Total orders", value: String(total) },
    { label: "Daily average", value: formatAvg(average) },
    {
      label: "Best day",
      value: bestIndex >= 0 ? String(peak) : "—",
      sub: bestIndex >= 0 ? fmtDay(data[bestIndex].day) : undefined,
    },
  ];

  return (
    <section className="space-y-3 pt-2 w-full lg:w-3/4">
      <div>
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <BarChart3 size={18} className="text-accent-600" /> Completed Orders by Day
        </h2>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">
          {subtitle}
          {isSingleDay && " · whole month shown, selected day highlighted"}
        </p>
      </div>

      <div className="rounded-2xl border border-warm-200 bg-white shadow-sm p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-warm-50 border border-warm-100 px-3 py-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                {s.label}
              </div>
              <div className="text-xl font-black text-slate-900 tabular-nums leading-tight">
                {s.value}
              </div>
              {s.sub && (
                <div className="text-[11px] font-semibold text-slate-500 truncate">{s.sub}</div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {/* Y axis title */}
          <div className={`${plotHeight} w-4 shrink-0 flex items-center justify-center`}>
            <span className="-rotate-90 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
              No. of orders
            </span>
          </div>
          {/* Y axis values */}
          <div className={`relative ${plotHeight} w-7 shrink-0 text-[11px] font-bold text-slate-500`}>
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute right-0 tabular-nums"
                style={{ bottom: `${(t / top) * 100}%`, transform: "translateY(50%)" }}
              >
                {t}
              </span>
            ))}
          </div>

          <div className="flex-1 min-w-0">
            {/* Plot */}
            <div className={`relative ${plotHeight}`}>
              {ticks.map((t) => (
                <div
                  key={t}
                  className={
                    t === 0
                      ? "absolute inset-x-0 border-t border-slate-300"
                      : "absolute inset-x-0 border-t border-dashed border-warm-200"
                  }
                  style={{ bottom: `${(t / top) * 100}%` }}
                />
              ))}

              {/* Daily average */}
              {total > 0 && data.length > 1 && (
                <div
                  className="absolute inset-x-0 z-10 pointer-events-none border-t-2 border-dashed border-slate-400/70"
                  style={{ bottom: `${(average / top) * 100}%` }}
                >
                  <span className="absolute right-0 -top-5 rounded bg-white/90 px-1.5 text-[10px] font-extrabold text-slate-500">
                    avg {formatAvg(average)}
                  </span>
                </div>
              )}

              <div className={`absolute inset-0 flex items-end ${gap}`}>
                {data.map((p, i) => {
                  const isSelected = isSingleDay && p.day.getTime() === selectedTime;
                  const isBest = i === bestIndex;
                  const barColor = isSingleDay
                    ? isSelected
                      ? "bg-accent-600"
                      : "bg-accent-200 group-hover:bg-accent-300"
                    : isBest
                    ? "bg-accent-600"
                    : "bg-accent-400 group-hover:bg-accent-500";
                  const showValue = isSingleDay ? isSelected : isBest;
                  // Keep the tooltip inside the card at the left and right edges.
                  const tipPos =
                    i < 3
                      ? "left-0"
                      : i > data.length - 4
                      ? "right-0"
                      : "left-1/2 -translate-x-1/2";
                  return (
                    <div
                      key={p.day.getTime()}
                      className="group relative flex-1 h-full flex items-end justify-center cursor-default rounded-md hover:bg-warm-50"
                    >
                      <div
                        className={`relative w-full max-w-9 rounded-t-md transition-colors ${
                          p.orders > 0 ? barColor : "bg-warm-200"
                        }`}
                        style={{
                          height: p.orders > 0 ? `${(p.orders / top) * 100}%` : 3,
                          minHeight: p.orders > 0 ? 4 : 0,
                        }}
                      >
                        {showValue && p.orders > 0 && (
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[11px] font-black text-slate-700 tabular-nums">
                            {p.orders}
                          </span>
                        )}
                      </div>
                      <div
                        className={`pointer-events-none absolute bottom-full mb-1 ${tipPos} hidden group-hover:block z-20 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg`}
                      >
                        <div className="font-semibold text-slate-300">
                          {p.day.toLocaleDateString("en-KE", {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="font-black text-sm">
                          Total: {p.orders} {p.orders === 1 ? "order" : "orders"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X axis */}
            <div className={`flex ${gap} mt-1.5`}>
              {data.map((p, i) => {
                const showMonth = spansMonths && (i === 0 || p.day.getDate() === 1);
                const isSelected = isSingleDay && p.day.getTime() === selectedTime;
                return (
                  <div
                    key={p.day.getTime()}
                    className={`flex-1 min-w-0 text-center text-[11px] font-bold tabular-nums ${
                      isSelected ? "text-accent-700" : "text-slate-500"
                    }`}
                  >
                    {i % labelEvery === 0 || showMonth || isSelected ? (
                      <>
                        {p.day.getDate()}
                        {showMonth && (
                          <div className="text-[10px] text-slate-400">
                            {p.day.toLocaleDateString("en-KE", { month: "short" })}
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-1 text-center text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
              Day of the month
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
