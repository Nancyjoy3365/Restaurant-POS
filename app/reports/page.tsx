"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Package,
  PiggyBank,
  Users2,
  Scale,
  Truck,
  Boxes,
  Banknote,
  Smartphone,
  BarChart3,
  Award,
} from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import {
  computeNetBreakdown,
  paymentMethodBreakdown,
  itemSalesTally,
} from "@/lib/reports";
import { payoutForRange, paidLeaveAmountInRange } from "@/lib/payroll";
import { NetTrendChart, type NetTrendPoint } from "@/components/reports/NetTrendChart";

function toDateInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Trend chart is capped to ~2 months of daily bars — beyond that it stops
// being readable as a "small trend chart" and just slows down the page for
// no benefit, so it's hidden past this length rather than rendered dense.
const MAX_TREND_DAYS = 62;

export default function ReportsPage() {
  const receipts = usePosStore((s) => s.receipts);
  const recipes = usePosStore((s) => s.recipes);
  const ingredients = usePosStore((s) => s.ingredients);
  const staff = usePosStore((s) => s.staff);
  const shifts = usePosStore((s) => s.shifts);
  const payments = usePosStore((s) => s.payments);
  const leaveRecords = usePosStore((s) => s.leaveRecords);
  const vendors = usePosStore((s) => s.vendors);

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

  // Every figure on this page — the top cards, the hero Net number, and each
  // day of the trend chart below — comes from this one function called with
  // different [start, end] windows, so they can never quietly disagree.
  const breakdown = computeNetBreakdown(
    receipts,
    recipes,
    ingredients,
    staff,
    shifts,
    payments,
    leaveRecords,
    vendors,
    rangeStart,
    rangeEnd
  );
  const marginPct =
    breakdown.revenue > 0 ? (breakdown.grossMargin / breakdown.revenue) * 100 : 0;

  const receiptsInRange = receipts.filter(
    (r) => r.issuedAt >= rangeStart.getTime() && r.issuedAt <= rangeEnd.getTime()
  );
  const { cash: cashRevenue, mpesa: mpesaRevenue } =
    paymentMethodBreakdown(receiptsInRange);

  const paidLeaveTotal = staff.reduce(
    (sum, member) =>
      sum + paidLeaveAmountInRange(member, shifts, leaveRecords, rangeStart, rangeEnd),
    0
  );
  const staffPayoutRows = staff
    .map((member) => ({
      member,
      payout: payoutForRange(member, shifts, payments, leaveRecords, rangeStart, rangeEnd),
    }))
    .filter((r) => r.payout > 0);

  const vendorsInRange = vendors.filter((v) => {
    const paidAt = new Date(`${v.lastPaymentDate}T12:00:00`);
    return paidAt >= rangeStart && paidAt <= rangeEnd;
  });
  const stockInRange = ingredients.filter(
    (ing) =>
      ing.purchasedAt !== undefined &&
      ing.purchasedAt >= rangeStart.getTime() &&
      ing.purchasedAt <= rangeEnd.getTime()
  );

  const itemTally = itemSalesTally(receiptsInRange);
  const bestSellers = itemTally.slice(0, 5);
  // Only split off a distinct "worst" list once there are enough items that
  // it wouldn't just be the same list as bestSellers in reverse.
  const worstSellers = itemTally.length > 5 ? itemTally.slice(-5).reverse() : [];

  // One bar per calendar day in range, reusing the exact same breakdown
  // function above — this is what makes the trend chart trustworthy instead
  // of a second, potentially-inconsistent calculation.
  const trendPoints: NetTrendPoint[] = [];
  {
    const cursor = new Date(rangeStart);
    cursor.setHours(0, 0, 0, 0);
    const lastDay = new Date(rangeEnd);
    lastDay.setHours(0, 0, 0, 0);
    let guard = 0;
    while (cursor <= lastDay && guard < MAX_TREND_DAYS) {
      const dayStart = new Date(cursor);
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);
      const dayBreakdown = computeNetBreakdown(
        receipts, recipes, ingredients, staff, shifts, payments,
        leaveRecords, vendors, dayStart, dayEnd
      );
      trendPoints.push({
        dateKey: toDateInputValue(cursor),
        label: cursor.toLocaleDateString("en-KE", { month: "short", day: "numeric" }),
        net: dayBreakdown.net,
      });
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }
  }

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
    <div className="flex-1 flex flex-col lg:h-full lg:overflow-hidden">
      <header className="shrink-0 h-16 flex items-center justify-between px-6 border-b border-warm-200 bg-white">
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

      <main className="flex-1 lg:min-h-0 overflow-y-auto p-6 space-y-6">
        <p className="text-sm font-bold text-slate-500">{rangeLabel}</p>

        {/* The primary takeaway metric — largest, most prominent element on
            the page, positioned first. */}
        <div
          className={clsx(
            "rounded-2xl border-2 p-6",
            breakdown.net >= 0
              ? "border-status-free/40 bg-status-free/5"
              : "border-rose-300 bg-rose-50"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank
              size={20}
              className={breakdown.net >= 0 ? "text-status-free" : "text-rose-600"}
            />
            <h2 className="font-extrabold text-slate-900">
              Net for the {isSingleDay ? "Day" : "Period"}
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-semibold mb-2">
            Gross margin minus staff payouts, vendor payments, and stock
            purchases for the selected period — a rough operating result, not
            a full accounting P&amp;L.
          </p>
          <div
            className={clsx(
              "text-4xl sm:text-5xl font-black tracking-tight",
              breakdown.net >= 0 ? "text-status-free" : "text-rose-600"
            )}
          >
            {formatKES(breakdown.net)}
          </div>
        </div>

        {trendPoints.length > 1 && (
          <div className="rounded-xl border border-warm-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={16} className="text-accent-600" />
              <h2 className="font-extrabold text-slate-900">Net Trend</h2>
            </div>
            <p className="text-xs text-slate-500 font-semibold mb-3">
              Net result for each day in the selected range.
            </p>
            <NetTrendChart points={trendPoints} />
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={TrendingUp}
            label="Revenue"
            value={formatKES(breakdown.revenue)}
            sub={`+${formatKES(breakdown.vatCollected)} VAT collected`}
            tone="accent"
          >
            {(cashRevenue > 0 || mpesaRevenue > 0) && (
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-accent-200/60 text-[11px] font-bold text-slate-600">
                <span className="flex items-center gap-1">
                  <Banknote size={11} /> {formatKES(cashRevenue)}
                </span>
                <span className="flex items-center gap-1">
                  <Smartphone size={11} /> {formatKES(mpesaRevenue)}
                </span>
              </div>
            )}
          </StatCard>
          <StatCard
            icon={Package}
            label="COGS"
            value={formatKES(breakdown.cogs)}
            sub="Recipe-tracked dishes only"
            tone="warm"
          />
          <StatCard
            icon={Scale}
            label="Gross Margin"
            value={formatKES(breakdown.grossMargin)}
            sub={`${marginPct.toFixed(0)}% margin`}
            tone="free"
          />
          <StatCard
            icon={Users2}
            label="Staff Payouts"
            value={formatKES(breakdown.staffPayouts)}
            sub="For the selected period, all roles"
            tone="warm"
          />
          <StatCard
            icon={Truck}
            label="Vendor Payments"
            value={formatKES(breakdown.vendorPayments)}
            sub="Vendors paid in this period"
            tone="warm"
          />
          <StatCard
            icon={Boxes}
            label="Stock Purchases"
            value={formatKES(breakdown.stockPurchases)}
            sub="Inventory bought in this period"
            tone="warm"
          />
        </div>

        {staffPayoutRows.length > 0 && (
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
              {staffPayoutRows.map(({ member, payout }) => (
                <div key={member.id} className="flex justify-between text-sm">
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
              ))}
            </div>
          </div>
        )}

        {vendorsInRange.length > 0 && (
          <div className="rounded-xl border border-warm-200 bg-white p-5">
            <h2 className="font-extrabold text-slate-900 mb-1">
              Vendor Payments
            </h2>
            <p className="text-xs text-slate-500 font-semibold mb-3">
              Vendors whose last recorded payment date falls in the selected
              period.
            </p>
            <div className="space-y-1.5">
              {vendorsInRange.map((v) => (
                <div key={v.id} className="flex justify-between text-sm">
                  <span className="font-bold text-slate-700">
                    {v.name}{" "}
                    <span className="text-slate-400 font-semibold">
                      · {v.category}
                      {v.paymentMethod === "mpesa" && v.lastPaymentReference
                        ? ` · Code: ${v.lastPaymentReference}`
                        : ""}
                    </span>
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {formatKES(v.lastPaymentAmount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stockInRange.length > 0 && (
          <div className="rounded-xl border border-warm-200 bg-white p-5">
            <h2 className="font-extrabold text-slate-900 mb-1">
              Stock Purchases
            </h2>
            <p className="text-xs text-slate-500 font-semibold mb-3">
              Inventory items recorded as purchased in the selected period.
            </p>
            <div className="space-y-1.5">
              {stockInRange.map((ing) => (
                <div key={ing.id} className="flex justify-between text-sm">
                  <span className="font-bold text-slate-700">
                    {ing.name}{" "}
                    <span className="text-slate-400 font-semibold">
                      · {ing.packaging}
                    </span>
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {formatKES(ing.totalCost)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {itemTally.length > 0 && (
          <div className="rounded-xl border border-warm-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-1">
              <Award size={16} className="text-accent-600" />
              <h2 className="font-extrabold text-slate-900">
                {worstSellers.length > 0 ? "Best & Worst Selling Items" : "Items Sold"}
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-semibold mb-3">
              By quantity sold in the selected period.
            </p>
            <div className={clsx("grid gap-4", worstSellers.length > 0 && "sm:grid-cols-2")}>
              <div>
                {worstSellers.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mb-2">
                    <TrendingUp size={12} /> Best Sellers
                  </div>
                )}
                <div className="space-y-1.5">
                  {bestSellers.map((item) => (
                    <div key={item.name} className="flex justify-between text-sm">
                      <span className="font-bold text-slate-700">{item.name}</span>
                      <span className="font-extrabold text-slate-900">
                        {item.qty} sold
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {worstSellers.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mb-2">
                    <TrendingDown size={12} /> Worst Sellers
                  </div>
                  <div className="space-y-1.5">
                    {worstSellers.map((item) => (
                      <div key={item.name} className="flex justify-between text-sm">
                        <span className="font-bold text-slate-700">{item.name}</span>
                        <span className="font-extrabold text-slate-900">
                          {item.qty} sold
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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
  children,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  sub: string;
  tone: "accent" | "warm" | "free";
  children?: React.ReactNode;
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
      {children}
    </div>
  );
}
