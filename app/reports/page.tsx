"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  Calendar,
  TrendingUp,
  Package,
  PiggyBank,
  Users2,
  Scale,
} from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import { computeCogs } from "@/lib/reports";
import { payoutForRange, paidLeaveAmountInRange } from "@/lib/payroll";

function toDateInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ReportsPage() {
  const receipts = usePosStore((s) => s.receipts);
  const recipes = usePosStore((s) => s.recipes);
  const ingredients = usePosStore((s) => s.ingredients);
  const staff = usePosStore((s) => s.staff);
  const shifts = usePosStore((s) => s.shifts);
  const payments = usePosStore((s) => s.payments);
  const leaveRecords = usePosStore((s) => s.leaveRecords);

  const todayStr = toDateInputValue(new Date());
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);

  const rangeStart = new Date(`${fromDate}T00:00:00`);
  const rangeEndInput = new Date(`${toDate}T23:59:59.999`);
  // If "to" ends up before "from" (e.g. mid-edit), just treat it as a
  // single-day range on "from" rather than showing an empty/negative range.
  const rangeEnd = rangeEndInput < rangeStart
    ? new Date(
        rangeStart.getFullYear(),
        rangeStart.getMonth(),
        rangeStart.getDate(),
        23, 59, 59, 999
      )
    : rangeEndInput;

  const receiptsInRange = receipts.filter(
    (r) => r.issuedAt >= rangeStart.getTime() && r.issuedAt <= rangeEnd.getTime()
  );
  const revenue = receiptsInRange.reduce((sum, r) => sum + r.subtotal, 0);
  const vatCollected = receiptsInRange.reduce((sum, r) => sum + r.vat, 0);
  const cogs = computeCogs(receiptsInRange, recipes, ingredients);
  const grossMargin = revenue - cogs;
  const marginPct = revenue > 0 ? (grossMargin / revenue) * 100 : 0;
  const staffPayouts = staff.reduce(
    (sum, member) =>
      sum + payoutForRange(member, shifts, payments, leaveRecords, rangeStart, rangeEnd),
    0
  );
  const paidLeaveTotal = staff.reduce(
    (sum, member) =>
      sum + paidLeaveAmountInRange(member, shifts, leaveRecords, rangeStart, rangeEnd),
    0
  );
  const netForDay = grossMargin - staffPayouts;

  const isSingleDay = fromDate === toDate;
  const rangeLabel = isSingleDay
    ? rangeStart.toLocaleDateString("en-KE", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : `${rangeStart.toLocaleDateString("en-KE", { month: "long", day: "numeric" })} – ${rangeEnd.toLocaleDateString("en-KE", { month: "long", day: "numeric", year: "numeric" })}`;

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 flex items-center justify-between px-6 border-b border-warm-200 bg-white">
        <h1 className="text-xl font-black text-slate-900">Financial Summary</h1>
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
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <p className="text-sm font-bold text-slate-500">{rangeLabel}</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={TrendingUp}
            label="Revenue"
            value={formatKES(revenue)}
            sub={`+${formatKES(vatCollected)} VAT collected`}
            tone="accent"
          />
          <StatCard
            icon={Package}
            label="COGS"
            value={formatKES(cogs)}
            sub="Recipe-tracked dishes only"
            tone="warm"
          />
          <StatCard
            icon={Scale}
            label="Gross Margin"
            value={formatKES(grossMargin)}
            sub={`${marginPct.toFixed(0)}% margin`}
            tone="free"
          />
          <StatCard
            icon={Users2}
            label="Staff Payouts"
            value={formatKES(staffPayouts)}
            sub="For the selected period, all roles"
            tone="warm"
          />
        </div>

        <div className="rounded-xl border border-warm-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank size={18} className="text-accent-600" />
            <h2 className="font-extrabold text-slate-900">
              Net for the {isSingleDay ? "Day" : "Period"}
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-semibold mb-3">
            Gross margin minus staff payouts for the selected period — a
            rough operating result, not a full accounting P&amp;L.
          </p>
          <div
            className={clsx(
              "text-2xl font-black",
              netForDay >= 0 ? "text-status-free" : "text-rose-600"
            )}
          >
            {formatKES(netForDay)}
          </div>
        </div>

        <div className="rounded-xl border border-warm-200 bg-white p-5">
          <h2 className="font-extrabold text-slate-900 mb-1">
            Staff Payouts
          </h2>
          <p className="text-xs text-slate-500 font-semibold mb-3">
            Daily-rate staff count per day clocked in; commission is sales
            within the selected period; monthly salaries are prorated across
            each day&rsquo;s month.
          </p>
          {paidLeaveTotal > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-warm-50 px-3 py-2 mb-3 text-xs">
              <span className="font-bold text-slate-500">
                Paid leave this period
              </span>
              <span className="font-extrabold text-slate-700">
                {formatKES(paidLeaveTotal)}
              </span>
            </div>
          )}
          <div className="space-y-1.5">
            {staff.map((member) => {
              const payout = payoutForRange(member, shifts, payments, leaveRecords, rangeStart, rangeEnd);
              if (payout === 0) return null;
              return (
                <div
                  key={member.id}
                  className="flex justify-between text-sm"
                >
                  <span className="font-bold text-slate-700">
                    {member.name}{" "}
                    <span className="text-slate-400 font-semibold">
                      · {member.role}
                    </span>
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {formatKES(payout)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  sub: string;
  tone: "accent" | "warm" | "free";
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border p-5",
        tone === "accent"
          ? "border-accent-200 bg-accent-50"
          : tone === "free"
          ? "border-status-free/30 bg-status-free/5"
          : "border-warm-200 bg-warm-50"
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1">
        <Icon size={14} /> {label}
      </div>
      <div className="text-2xl font-black text-slate-900">{value}</div>
      <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
        {sub}
      </div>
    </div>
  );
}
