"use client";

import clsx from "clsx";
import { Calendar } from "lucide-react";

type Preset = "this-week" | "this-month" | "last-month";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "this-week", label: "This week" },
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
];

export function toDateInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Returns [from, to] as date-input strings. Weeks start on Monday.
function presetDates(preset: Preset, now = new Date()): [string, string] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = toDateInputValue(now);
  if (preset === "this-week") {
    const mondayOffset = (now.getDay() + 6) % 7;
    return [toDateInputValue(new Date(y, m, now.getDate() - mondayOffset)), today];
  }
  if (preset === "this-month") {
    return [toDateInputValue(new Date(y, m, 1)), today];
  }
  return [toDateInputValue(new Date(y, m - 1, 1)), toDateInputValue(new Date(y, m, 0))];
}

export default function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const todayStr = toDateInputValue(new Date());

  // A preset is highlighted only while the dates still match it, so picking
  // your own dates simply un-highlights it.
  const activePreset = PRESETS.find((p) => {
    const [f, t] = presetDates(p.id);
    return f === from && t === to;
  })?.id;

  // Keep the range running forwards (earlier → later, never past today):
  // moving one end past the other drags the other end along with it.
  function changeFrom(value: string) {
    if (!value) return;
    const f = value > todayStr ? todayStr : value;
    onChange(f, to < f ? f : to);
  }
  function changeTo(value: string) {
    if (!value) return;
    const t = value > todayStr ? todayStr : value;
    onChange(from > t ? t : from, t);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-full bg-warm-50 border border-warm-200 p-1">
        {PRESETS.map((p) => {
          const active = activePreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={active}
              title={active ? "Click again to clear and pick your own dates" : undefined}
              onClick={() => {
                // Toggle: clicking the highlighted preset again un-selects
                // it and puts both pickers back on today.
                if (active) onChange(todayStr, todayStr);
                else onChange(...presetDates(p.id));
              }}
              className={clsx(
                "rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors",
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 rounded-full border border-warm-200 bg-white px-3 py-2">
          <Calendar size={14} className="text-accent-600 shrink-0" />
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => changeFrom(e.target.value)}
            className="text-xs font-extrabold text-accent-700 outline-none bg-transparent"
          />
        </label>
        <span className="text-xs font-extrabold text-slate-400">to</span>
        <label className="flex items-center gap-2 rounded-full border border-warm-200 bg-white px-3 py-2">
          <Calendar size={14} className="text-accent-600 shrink-0" />
          <input
            type="date"
            value={to}
            min={from}
            max={todayStr}
            onChange={(e) => changeTo(e.target.value)}
            className="text-xs font-extrabold text-accent-700 outline-none bg-transparent"
          />
        </label>
      </div>
    </div>
  );
}
