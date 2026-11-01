"use client";

import { Fragment, useState } from "react";
import clsx from "clsx";
import type { ItemsSoldReport, SalesGroup } from "@/lib/reports";

type GroupFilter = "All" | SalesGroup;

const FILTER_CHIPS: GroupFilter[] = ["All", "Main", "Juice", "Extras", "Soda & water"];

// Same hues each category already uses on the menu/order screens
// (lib/menuVisuals.ts), with Main on the brand accent.
const GROUP_COLOR: Record<SalesGroup, string> = {
  Main: "bg-accent-500",
  Juice: "bg-pink-400",
  Extras: "bg-emerald-500",
  "Soda & water": "bg-sky-500",
  Other: "bg-slate-400",
};

export function ItemsSoldTable({ report }: { report: ItemsSoldReport }) {
  const [filter, setFilter] = useState<GroupFilter>("All");

  const visibleGroups =
    filter === "All" ? report.groups : report.groups.filter((g) => g.group === filter);
  // Volume bars scale to the single top-selling item currently on screen.
  const maxTotal = Math.max(1, ...visibleGroups.flatMap((g) => g.rows.map((r) => r.total)));

  return (
    <div className="rounded-xl border border-warm-200 bg-white p-5 space-y-4">
      <div>
        <div className="flex h-3 rounded-full overflow-hidden bg-warm-100">
          {report.groups.map((g) => (
            <div
              key={g.group}
              className={GROUP_COLOR[g.group]}
              style={{ width: `${(g.total / report.totalQty) * 100}%` }}
              title={`${g.group}: ${g.total} sold`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2.5">
          {report.groups.map((g) => (
            <span key={g.group} className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <span className={clsx("h-2.5 w-2.5 rounded-full", GROUP_COLOR[g.group])} />
              {g.group}
              <span className="font-extrabold text-slate-900 tabular-nums">{g.total}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto">
          {FILTER_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={clsx(
                "shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition-colors",
                filter === c
                  ? "bg-accent-600 text-white"
                  : "bg-warm-50 text-slate-600 border border-warm-200 hover:border-accent-300"
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-accent-500" /> In-house
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-accent-200" /> Takeaway
          </span>
        </div>
      </div>

      {visibleGroups.length === 0 ? (
        <p className="text-sm font-semibold text-slate-400 py-6 text-center">
          Nothing sold in this category for the selected period.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-warm-200">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-right px-3 py-3 w-24">In-house</th>
                <th className="text-right px-3 py-3 w-24">Takeaway</th>
                <th className="text-right px-3 py-3 w-20">Total</th>
                <th className="text-left px-4 py-3 w-[32%]">Volume</th>
              </tr>
            </thead>
            <tbody>
              {visibleGroups.map((g) => (
                <Fragment key={g.group}>
                  <tr className="border-t border-warm-200 bg-warm-50/60">
                    <td colSpan={5} className="px-4 py-2">
                      <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-600">
                        <span className={clsx("h-2.5 w-2.5 rounded-full", GROUP_COLOR[g.group])} />
                        {g.group}
                        <span className="normal-case tracking-normal font-bold text-slate-400 tabular-nums">
                          {g.total} sold
                        </span>
                      </span>
                    </td>
                  </tr>
                  {g.rows.map((row) => (
                    <tr key={row.key} className="border-t border-warm-100">
                      <td className="px-4 py-2 font-bold text-slate-700">{row.name}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700 tabular-nums">
                        {row.inHouse > 0 ? row.inHouse : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700 tabular-nums">
                        {row.takeaway > 0 ? row.takeaway : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-extrabold text-slate-900 tabular-nums">
                        {row.total}
                      </td>
                      <td className="px-4 py-2">
                        <div
                          role="img"
                          aria-label={`${row.name}: ${row.inHouse} in-house, ${row.takeaway} takeaway`}
                          className="flex h-2.5 rounded-full overflow-hidden"
                          style={{ width: `${(row.total / maxTotal) * 100}%` }}
                        >
                          <div className="bg-accent-500" style={{ flexGrow: row.inHouse }} />
                          <div className="bg-accent-200" style={{ flexGrow: row.takeaway }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
