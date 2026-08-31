"use client";

import clsx from "clsx";
import { TrendingUp, Package, PiggyBank, Users2, Scale } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import { computeCogs, isToday } from "@/lib/reports";
import { dailyPayout } from "@/lib/payroll";

export default function ReportsPage() {
  const receipts = usePosStore((s) => s.receipts);
  const recipes = usePosStore((s) => s.recipes);
  const ingredients = usePosStore((s) => s.ingredients);
  const staff = usePosStore((s) => s.staff);
  const shifts = usePosStore((s) => s.shifts);
  const payments = usePosStore((s) => s.payments);

  const todaysReceipts = receipts.filter((r) => isToday(r.issuedAt));
  const revenue = todaysReceipts.reduce((sum, r) => sum + r.subtotal, 0);
  const vatCollected = todaysReceipts.reduce((sum, r) => sum + r.vat, 0);
  const cogs = computeCogs(todaysReceipts, recipes, ingredients);
  const grossMargin = revenue - cogs;
  const marginPct = revenue > 0 ? (grossMargin / revenue) * 100 : 0;
  const staffPayouts = staff.reduce(
    (sum, member) => sum + dailyPayout(member, shifts, payments),
    0
  );
  const netForDay = grossMargin - staffPayouts;

  const today = new Date().toLocaleDateString("en-KE", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 flex items-center px-6 border-b border-warm-200 bg-white">
        <h1 className="text-xl font-black text-slate-900">Financial Summary</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <p className="text-sm font-bold text-slate-500">{today}</p>

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
            sub="Today's share, all roles"
            tone="warm"
          />
        </div>

        <div className="rounded-xl border border-warm-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank size={18} className="text-accent-600" />
            <h2 className="font-extrabold text-slate-900">Net for the Day</h2>
          </div>
          <p className="text-xs text-slate-500 font-semibold mb-3">
            Gross margin minus today&rsquo;s staff payouts — a rough operating
            result, not a full accounting P&amp;L.
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
            Staff Payouts Today
          </h2>
          <p className="text-xs text-slate-500 font-semibold mb-3">
            Daily-rate staff count only if clocked in today; commission is
            today&rsquo;s sales only; monthly salaries are prorated across the
            days in the current month.
          </p>
          <div className="space-y-1.5">
            {staff.map((member) => {
              const payout = dailyPayout(member, shifts, payments);
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
