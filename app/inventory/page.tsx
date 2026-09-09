"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  Pencil,
  Plus,
  PackagePlus,
  Search,
  X,
  Trash2,
  History,
  Banknote,
  RotateCcw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import { AddIngredientModal } from "@/components/inventory/AddIngredientModal";
import { RestockModal } from "@/components/inventory/RestockModal";
import { AddServiceExpenseModal } from "@/components/inventory/AddServiceExpenseModal";
import { VendorPayoutModal } from "@/components/inventory/VendorPayoutModal";
import { VendorHistoryModal } from "@/components/inventory/VendorHistoryModal";
import type { Ingredient, ServiceExpense, Vendor, VendorPaymentTerms } from "@/lib/types";

type Tab = "stock" | "services" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "stock", label: "Stock" },
  { id: "services", label: "Services and Repair" },
  { id: "history", label: "Vendor Statement" },
];

const PAYMENT_TERMS_LABEL: Record<VendorPaymentTerms, string> = {
  "due-on-receipt": "Due on receipt",
  "net-15": "Net-15",
  "net-30": "Net-30",
  "net-60": "Net-60",
};

const DEFAULT_FROM_DATE = "2020-01-01";

function formatPaymentDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>("stock");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [restockingItem, setRestockingItem] = useState<Ingredient | null>(null);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceExpense | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [showAllPaymentsModal, setShowAllPaymentsModal] = useState(false);
  const [fromDate, setFromDate] = useState(DEFAULT_FROM_DATE);
  const [toDate, setToDate] = useState(() => toISODate(new Date()));
  const [categoryFilter, setCategoryFilter] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "balance">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [payoutVendor, setPayoutVendor] = useState<Vendor | null>(null);
  const [historyVendor, setHistoryVendor] = useState<Vendor | null>(null);
  const ingredients = usePosStore((s) => s.ingredients);
  const vendors = usePosStore((s) => s.vendors);
  const stockPurchases = usePosStore((s) => s.stockPurchases);
  const vendorPayments = usePosStore((s) => s.vendorPayments);
  const serviceExpenses = usePosStore((s) => s.serviceExpenses);
  const deleteServiceExpense = usePosStore((s) => s.deleteServiceExpense);

  const historyQuery = historySearch.trim().toLowerCase();
  const paymentHistory = vendorPayments
    .filter((p) => {
      if (!historyQuery) return true;
      const vendorName = vendors.find((v) => v.id === p.vendorId)?.name.toLowerCase() ?? "";
      const reference = (p.reference ?? "").toLowerCase();
      const vendorItemNames = stockPurchases
        .filter((sp) => sp.vendorId === p.vendorId)
        .map((sp) => ingredients.find((i) => i.id === sp.ingredientId)?.name.toLowerCase() ?? "");
      return (
        vendorName.includes(historyQuery) ||
        reference.includes(historyQuery) ||
        vendorItemNames.some((name) => name.includes(historyQuery))
      );
    })
    .slice()
    .sort((a, b) => b.paidAt - a.paidAt);

  function currentBalanceOwed(vendorId: string): number {
    return stockPurchases
      .filter((p) => p.vendorId === vendorId && !p.paid)
      .reduce((sum, p) => sum + p.totalCost, 0);
  }

  const vendorCategories = Array.from(new Set(vendors.map((v) => v.category))).sort();
  const vendorQuery = vendorSearch.trim().toLowerCase();
  const rangeStart = parseLocalDate(fromDate);
  const rangeEnd = parseLocalDate(toDate) + 24 * 60 * 60 * 1000;

  const vendorRows = vendors
    .filter((v) => !categoryFilter || v.category === categoryFilter)
    .filter((v) => {
      if (!vendorQuery) return true;
      return (
        v.name.toLowerCase().includes(vendorQuery) ||
        (v.contactPerson ?? "").toLowerCase().includes(vendorQuery) ||
        v.category.toLowerCase().includes(vendorQuery)
      );
    })
    .map((v) => {
      const purchasesBefore = stockPurchases.filter(
        (p) => p.vendorId === v.id && p.purchasedAt < rangeStart
      );
      const paymentsBefore = vendorPayments.filter(
        (p) => p.vendorId === v.id && p.paidAt < rangeStart
      );
      const opening =
        purchasesBefore.reduce((sum, p) => sum + p.totalCost, 0) -
        paymentsBefore.reduce((sum, p) => sum + p.amount, 0);

      const purchasesInRange = stockPurchases.filter(
        (p) => p.vendorId === v.id && p.purchasedAt >= rangeStart && p.purchasedAt < rangeEnd
      );
      const paymentsInRange = vendorPayments.filter(
        (p) => p.vendorId === v.id && p.paidAt >= rangeStart && p.paidAt < rangeEnd
      );

      const invoicesTotal = purchasesInRange.reduce((sum, p) => sum + p.totalCost, 0);
      const paymentsTotal = paymentsInRange.reduce((sum, p) => sum + p.amount, 0);

      return {
        vendor: v,
        opening,
        invoicesTotal,
        invoicesCount: purchasesInRange.length,
        paymentsTotal,
        paymentsCount: paymentsInRange.length,
        endingBalance: opening + invoicesTotal - paymentsTotal,
      };
    })
    .sort((a, b) => {
      const cmp =
        sortBy === "name"
          ? a.vendor.name.localeCompare(b.vendor.name)
          : a.endingBalance - b.endingBalance;
      return sortDir === "asc" ? cmp : -cmp;
    });

  const vendorTotals = vendorRows.reduce(
    (acc, row) => ({
      opening: acc.opening + row.opening,
      invoices: acc.invoices + row.invoicesTotal,
      payments: acc.payments + row.paymentsTotal,
      endingBalance: acc.endingBalance + row.endingBalance,
    }),
    { opening: 0, invoices: 0, payments: 0, endingBalance: 0 }
  );

  function toggleSort(column: "name" | "balance") {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  function resetVendorFilters() {
    setFromDate(DEFAULT_FROM_DATE);
    setToDate(toISODate(new Date()));
    setCategoryFilter("");
    setVendorSearch("");
  }

  return (
    <div className="flex-1 flex flex-col lg:h-full lg:overflow-hidden">
      <header className="shrink-0 h-16 flex items-center justify-between px-6 border-b border-warm-200 bg-white">
        <h1 className="text-xl font-black text-slate-900">Inventory</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-full border border-warm-200 p-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  "rounded-full px-4 py-1.5 text-xs font-extrabold transition-colors",
                  tab === t.id
                    ? "bg-accent-600 text-white"
                    : "text-slate-500 hover:text-accent-700"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === "stock" && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white text-sm font-extrabold px-4 py-2.5 transition-colors"
            >
              <Plus size={16} strokeWidth={3} /> Add Item
            </button>
          )}
          {tab === "services" && (
            <button
              type="button"
              onClick={() => setShowAddServiceModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white text-sm font-extrabold px-4 py-2.5 transition-colors"
            >
              <Plus size={16} strokeWidth={3} /> Add Service
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 lg:min-h-0 overflow-y-auto p-6">
        {tab === "stock" && (
          <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
            {ingredients.length === 0 ? (
              <p className="text-slate-400 font-semibold text-center py-12">
                No stock items yet — use &ldquo;Add Item&rdquo; to get started.
              </p>
            ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Item</th>
                  <th className="text-left px-2 py-3">Packaging</th>
                  <th className="text-right px-2 py-3">Amount</th>
                  <th className="text-right px-2 py-3">Quantity</th>
                  <th className="text-right px-2 py-3">Piece</th>
                  <th className="text-right px-2 py-3">Unit Cost</th>
                  <th className="text-left px-2 py-3">Unit</th>
                  <th className="text-center px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing) => {
                  return (
                    <tr key={ing.id} className="border-t border-warm-100">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {ing.name}
                      </td>
                      <td className="px-2 py-3 text-slate-600 font-semibold">
                        {ing.packaging}
                      </td>
                      <td className="px-2 py-3 text-right font-bold text-slate-900">
                        {formatKES(ing.totalCost)}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-700">
                        {ing.quantity}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-700">
                        {ing.piecesPerPackage}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-700">
                        {formatKES(ing.unitCost)}
                      </td>
                      <td className="px-2 py-3 text-slate-500 font-semibold">
                        {ing.unitAmount ?? 1} {ing.unit}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setRestockingItem(ing)}
                            aria-label={`Restock ${ing.name}`}
                            title={`Restock ${ing.name}`}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-warm-200 text-slate-500 hover:border-accent-300 hover:text-accent-700"
                          >
                            <PackagePlus size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingIngredient(ing)}
                            aria-label={`Edit ${ing.name}`}
                            title={`Edit ${ing.name}`}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-warm-200 text-slate-500 hover:border-accent-300 hover:text-accent-700"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-warm-200 bg-warm-50">
                  <td colSpan={2} className="px-4 py-3 text-right font-extrabold text-slate-700">
                    Total Cost of Goods
                  </td>
                  <td className="px-2 py-3 text-right font-black text-slate-900">
                    {formatKES(
                      ingredients.reduce((sum, ing) => sum + ing.totalCost, 0)
                    )}
                  </td>
                  <td colSpan={5}></td>
                </tr>
              </tfoot>
            </table>
            </div>
            )}
          </div>
        )}

        {tab === "services" && (
          <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
            {serviceExpenses.length === 0 ? (
              <p className="text-slate-400 font-semibold text-center py-12">
                No services or repairs recorded yet — use &ldquo;Add Service&rdquo; to get started.
              </p>
            ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Description</th>
                  <th className="text-left px-2 py-3">Category</th>
                  <th className="text-right px-2 py-3">Amount</th>
                  <th className="text-left px-2 py-3">Date</th>
                  <th className="text-center px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {[...serviceExpenses]
                  .sort((a, b) => b.incurredAt - a.incurredAt)
                  .map((expense) => (
                    <tr key={expense.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {expense.description}
                      </td>
                      <td className="px-2 py-3 text-slate-600 font-semibold">
                        {expense.category}
                      </td>
                      <td className="px-2 py-3 text-right font-extrabold text-slate-900">
                        {formatKES(expense.amount)}
                      </td>
                      <td className="px-2 py-3 text-slate-600 font-semibold whitespace-nowrap">
                        {new Date(expense.incurredAt).toLocaleDateString("en-KE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingService(expense)}
                            aria-label={`Edit ${expense.description}`}
                            title={`Edit ${expense.description}`}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-warm-200 text-slate-500 hover:border-accent-300 hover:text-accent-700"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteServiceExpense(expense.id)}
                            aria-label={`Delete ${expense.description}`}
                            title={`Delete ${expense.description}`}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-warm-200 text-slate-500 hover:border-rose-300 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-warm-200 bg-warm-50">
                  <td colSpan={2} className="px-4 py-3 text-right font-extrabold text-slate-700">
                    Total Spent
                  </td>
                  <td className="px-2 py-3 text-right font-black text-slate-900">
                    {formatKES(
                      serviceExpenses.reduce((sum, e) => sum + e.amount, 0)
                    )}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
            )}
          </div>
        )}

        {tab === "history" && (
          <>
            <div className="rounded-xl border border-warm-200 bg-white p-4 mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-lg border border-warm-200 px-3 py-2 text-xs font-extrabold text-slate-600 outline-none focus:border-accent-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-lg border border-warm-200 px-3 py-2 text-xs font-extrabold text-slate-600 outline-none focus:border-accent-400"
                />
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  placeholder="Search vendors..."
                  className="w-full rounded-full border border-warm-200 bg-white pl-8 pr-3 py-2 text-sm font-semibold outline-none focus:border-accent-400"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-warm-200 px-3 py-2 text-xs font-extrabold text-slate-600 outline-none focus:border-accent-400 bg-white"
              >
                <option value="">All Categories</option>
                {vendorCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={resetVendorFilters}
                className="flex items-center gap-1.5 rounded-lg border border-warm-200 px-3 py-2 text-xs font-extrabold text-slate-500 hover:text-slate-700"
              >
                <RotateCcw size={13} /> Reset
              </button>
              <span className="text-xs font-extrabold text-slate-400 whitespace-nowrap">
                {vendorRows.length} vendor{vendorRows.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-warm-200">
                <h2 className="font-extrabold text-slate-900">Vendor Statement</h2>
                <button
                  type="button"
                  onClick={() => setShowAllPaymentsModal(true)}
                  className="flex items-center gap-1.5 rounded-full bg-accent-600 hover:bg-accent-700 text-white text-xs font-extrabold px-3.5 py-2"
                >
                  <History size={13} /> View All Payments
                </button>
              </div>
              {vendorRows.length === 0 ? (
                <p className="text-slate-400 font-semibold text-center py-12">
                  No vendors match this filter.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[960px]">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                      <tr>
                        <th
                          className="text-left px-4 py-3 cursor-pointer select-none"
                          onClick={() => toggleSort("name")}
                        >
                          <span className="inline-flex items-center gap-1">
                            Vendor Name
                            {sortBy === "name" &&
                              (sortDir === "asc" ? (
                                <ChevronUp size={12} />
                              ) : (
                                <ChevronDown size={12} />
                              ))}
                          </span>
                        </th>
                        <th className="text-left px-2 py-3">Contact Person</th>
                        <th className="text-right px-2 py-3">Opening</th>
                        <th className="text-right px-2 py-3">Invoices</th>
                        <th className="text-right px-2 py-3">Payments</th>
                        <th
                          className="text-right px-2 py-3 cursor-pointer select-none"
                          onClick={() => toggleSort("balance")}
                        >
                          <span className="inline-flex items-center gap-1 justify-end">
                            Ending Balance
                            {sortBy === "balance" &&
                              (sortDir === "asc" ? (
                                <ChevronUp size={12} />
                              ) : (
                                <ChevronDown size={12} />
                              ))}
                          </span>
                        </th>
                        <th className="text-left px-2 py-3">Payment Terms</th>
                        <th className="text-center px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorRows.map((row) => (
                        <tr key={row.vendor.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {row.vendor.name}
                          </td>
                          <td className="px-2 py-3">
                            <div className="font-semibold text-slate-700">
                              {row.vendor.contactPerson || "—"}
                            </div>
                            {row.vendor.phone && (
                              <div className="text-[11px] text-slate-400 font-semibold">
                                {row.vendor.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-3 text-right font-semibold text-slate-700">
                            {formatKES(row.opening)}
                          </td>
                          <td className="px-2 py-3 text-right">
                            <div className="font-semibold text-slate-700">
                              {formatKES(row.invoicesTotal)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold">
                              {row.invoicesCount} inv
                            </div>
                          </td>
                          <td className="px-2 py-3 text-right">
                            <div className="font-semibold text-emerald-600">
                              {formatKES(row.paymentsTotal)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold">
                              {row.paymentsCount} pmt
                            </div>
                          </td>
                          <td className="px-2 py-3 text-right">
                            <div
                              className={clsx(
                                "font-extrabold",
                                row.endingBalance > 0
                                  ? "text-amber-600"
                                  : row.endingBalance < 0
                                  ? "text-emerald-600"
                                  : "text-slate-900"
                              )}
                            >
                              {formatKES(Math.abs(row.endingBalance))}
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold">
                              {row.endingBalance > 0
                                ? "You Owe Vendor"
                                : row.endingBalance < 0
                                ? "Vendor Owes You"
                                : "Balanced"}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-slate-600 font-semibold whitespace-nowrap">
                            {PAYMENT_TERMS_LABEL[row.vendor.paymentTerms ?? "net-30"]}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setHistoryVendor(row.vendor)}
                                aria-label={`View statement for ${row.vendor.name}`}
                                title="Purchase & payment history"
                                className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-warm-200 text-slate-500 hover:border-accent-300 hover:text-accent-700"
                              >
                                <History size={14} />
                              </button>
                              <button
                                type="button"
                                disabled={currentBalanceOwed(row.vendor.id) <= 0}
                                onClick={() => setPayoutVendor(row.vendor)}
                                aria-label={`Add payout for ${row.vendor.name}`}
                                title={
                                  currentBalanceOwed(row.vendor.id) <= 0
                                    ? "Nothing currently owed to this vendor"
                                    : "Record payout"
                                }
                                className="inline-flex items-center gap-1.5 rounded-full bg-accent-600 hover:bg-accent-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-extrabold px-3 py-1.5"
                              >
                                <Banknote size={12} /> Payout
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-warm-200 bg-warm-50">
                        <td
                          colSpan={2}
                          className="px-4 py-3 font-extrabold text-slate-700 whitespace-nowrap"
                        >
                          Totals — {vendorRows.length} vendor{vendorRows.length === 1 ? "" : "s"}
                        </td>
                        <td className="px-2 py-3 text-right font-black text-slate-900">
                          {formatKES(vendorTotals.opening)}
                        </td>
                        <td className="px-2 py-3 text-right font-black text-slate-900">
                          {formatKES(vendorTotals.invoices)}
                        </td>
                        <td className="px-2 py-3 text-right font-black text-emerald-600">
                          {formatKES(vendorTotals.payments)}
                        </td>
                        <td className="px-2 py-3 text-right font-black text-slate-900">
                          {formatKES(Math.abs(vendorTotals.endingBalance))}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {showAddModal && (
        <AddIngredientModal onClose={() => setShowAddModal(false)} />
      )}
      {editingIngredient && (
        <AddIngredientModal
          item={editingIngredient}
          onClose={() => setEditingIngredient(null)}
        />
      )}
      {restockingItem && (
        <RestockModal
          item={restockingItem}
          onClose={() => setRestockingItem(null)}
        />
      )}
      {showAddServiceModal && (
        <AddServiceExpenseModal onClose={() => setShowAddServiceModal(false)} />
      )}
      {editingService && (
        <AddServiceExpenseModal
          expense={editingService}
          onClose={() => setEditingService(null)}
        />
      )}
      {payoutVendor && (
        <VendorPayoutModal
          vendor={payoutVendor}
          balanceOwed={currentBalanceOwed(payoutVendor.id)}
          onClose={() => setPayoutVendor(null)}
        />
      )}
      {historyVendor && (
        <VendorHistoryModal
          vendor={historyVendor}
          onClose={() => setHistoryVendor(null)}
        />
      )}
      {showAllPaymentsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setShowAllPaymentsModal(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900">All Vendor Payments</h3>
              <button
                type="button"
                onClick={() => setShowAllPaymentsModal(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="relative w-full sm:w-72 mb-4">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search by M-Pesa code, vendor, or item"
                className="w-full rounded-full border border-warm-200 bg-white pl-8 pr-8 py-2 text-sm font-semibold outline-none focus:border-accent-400"
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => setHistorySearch("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {paymentHistory.length === 0 ? (
                <p className="text-slate-400 font-semibold text-center py-12">
                  No vendor payments recorded yet.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2">Date</th>
                      <th className="text-left px-2 py-2">Vendor</th>
                      <th className="text-left px-2 py-2">Method</th>
                      <th className="text-left px-2 py-2">Reference</th>
                      <th className="text-right px-4 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((p) => {
                      const vendorName =
                        vendors.find((v) => v.id === p.vendorId)?.name ??
                        "Unknown vendor";
                      return (
                        <tr key={p.id} className="border-t border-slate-100">
                          <td className="px-4 py-2 text-slate-600 font-semibold whitespace-nowrap">
                            {formatPaymentDate(p.paidAt)}
                          </td>
                          <td className="px-2 py-2 font-bold text-slate-900">
                            {vendorName}
                          </td>
                          <td className="px-2 py-2 text-slate-700 font-semibold">
                            {p.method === "mpesa" ? "M-Pesa" : "Cash"}
                          </td>
                          <td className="px-2 py-2 text-slate-600 font-semibold">
                            {p.reference || "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-extrabold text-slate-900">
                            {formatKES(p.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 border-t border-warm-200 pt-3 mt-3">
              <span>Total Paid</span>
              <span>{formatKES(paymentHistory.reduce((sum, p) => sum + p.amount, 0))}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
