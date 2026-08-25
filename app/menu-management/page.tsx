"use client";

import { Fragment, useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronRight } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { Toggle } from "@/components/shared/Toggle";
import { formatKES } from "@/lib/utils";

export default function MenuManagementPage() {
  const menu = usePosStore((s) => s.menu);
  const toggleMenuAvailability = usePosStore((s) => s.toggleMenuAvailability);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 flex items-center px-6 border-b border-slate-200 bg-white">
        <h1 className="text-xl font-black text-slate-900">Menu Management</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 w-8"></th>
                <th className="text-left px-2 py-3">Item</th>
                <th className="text-left px-2 py-3">Category</th>
                <th className="text-right px-2 py-3">Price</th>
                <th className="text-left px-2 py-3">Modifiers</th>
                <th className="text-left px-2 py-3">Combo</th>
                <th className="text-center px-4 py-3">Available</th>
              </tr>
            </thead>
            <tbody>
              {menu.map((item) => {
                const modifiers = [
                  ...(item.spiceLevels ?? []),
                  ...(item.addOns?.map((a) => a.name) ?? []),
                ].join(", ");
                const expanded = expandedId === item.id;
                return (
                  <Fragment key={item.id}>
                    <tr
                      className={clsx(
                        "border-t border-slate-100",
                        !item.available && "opacity-50"
                      )}
                    >
                      <td className="px-4 py-3">
                        {item.comboComponents && (
                          <button
                            onClick={() =>
                              setExpandedId(expanded ? null : item.id)
                            }
                            className="text-slate-400 hover:text-accent-600"
                          >
                            {expanded ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-3 font-bold text-slate-900">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={clsx(
                              "inline-block h-2.5 w-2.5 rounded-sm border-2",
                              item.veg
                                ? "border-emerald-600"
                                : "border-rose-600"
                            )}
                          />
                          {item.name}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-slate-600 font-semibold">
                        {item.category}
                      </td>
                      <td className="px-2 py-3 text-right font-bold text-slate-900">
                        {formatKES(item.price)}
                      </td>
                      <td className="px-2 py-3 text-slate-500 font-semibold text-xs">
                        {modifiers || "—"}
                      </td>
                      <td className="px-2 py-3">
                        {item.comboTag && (
                          <span className="inline-block rounded-full bg-accent-100 text-accent-700 text-[10px] font-extrabold px-2 py-0.5 uppercase">
                            {item.comboTag}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <Toggle
                            checked={item.available}
                            onChange={() => toggleMenuAvailability(item.id)}
                            label={`Toggle availability for ${item.name}`}
                          />
                        </div>
                      </td>
                    </tr>
                    {expanded && item.comboComponents && (
                      <tr className="bg-accent-50/50 border-t border-accent-100">
                        <td></td>
                        <td colSpan={6} className="px-2 py-3">
                          <div className="text-xs font-extrabold uppercase tracking-wide text-accent-700 mb-2">
                            {item.name} — Combo Breakdown
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.comboComponents.map((c) => (
                              <span
                                key={c.name}
                                className="rounded-lg bg-white border border-accent-200 px-3 py-1.5 text-xs font-bold text-slate-700"
                              >
                                {c.name}{" "}
                                <span className="text-slate-400">
                                  · {c.qty}
                                </span>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
