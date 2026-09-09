"use client";

import { Fragment, useState } from "react";
import clsx from "clsx";
import {
  AlertCircle,
  Banknote,
  Calendar,
  CheckCircle2,
  RotateCcw,
  Search,
  Smartphone,
  Trash2,
  X,
  Plus,
} from "lucide-react";
import { usePosStore, paymentsForCurrentCycle, unbilledOrderTotal } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import { PaymentSuccessModal } from "@/components/billing/PaymentSuccessModal";
import { ticketSubtitle } from "@/components/tickets/ticketStatus";
import type { CashDrop, Payment, PaymentMethod, Receipt, Ticket, TicketOrder } from "@/lib/types";

const CASH_DROP_METHODS: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "mpesa", label: "M-Pesa", icon: Smartphone },
];

function formatTime(ts: number, includeDate = false): string {
  const d = new Date(ts);
  const time = d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
  if (!includeDate) return time;
  const date = d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
  return `${date}, ${time}`;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export default function CashierPage() {
  const tickets = usePosStore((s) => s.tickets);
  const orders = usePosStore((s) => s.orders);
  const staff = usePosStore((s) => s.staff);
  const vatRate = usePosStore((s) => s.restaurantSettings.vatRate);
  const payments = usePosStore((s) => s.payments);
  const cashDrops = usePosStore((s) => s.cashDrops);
  const recordPayment = usePosStore((s) => s.recordPayment);
  const finalizeReceipt = usePosStore((s) => s.finalizeReceipt);
  const confirmOrderComplete = usePosStore((s) => s.confirmOrderComplete);
  const reverseLastPayment = usePosStore((s) => s.reverseLastPayment);
  const reverseCompletedPayment = usePosStore((s) => s.reverseCompletedPayment);
  const recordCashDrop = usePosStore((s) => s.recordCashDrop);
  const deleteCashDrop = usePosStore((s) => s.deleteCashDrop);

  const [tab, setTab] = useState<"live" | "reconciliation">("live");
  const [search, setSearch] = useState("");
  const [cashDrafts, setCashDrafts] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [waiterFilter, setWaiterFilter] = useState("");
  const [fromDate, setFromDate] = useState(() => toISODate(new Date()));
  const [toDate, setToDate] = useState(() => toISODate(new Date()));
  const [reconTab, setReconTab] = useState<"owed" | "history">("owed");

  const [cashDropOpen, setCashDropOpen] = useState(false);
  const [cashDropIsLumpsum, setCashDropIsLumpsum] = useState(false);
  const [cashDropWaiterId, setCashDropWaiterId] = useState("");
  const [cashDropMethod, setCashDropMethod] = useState<PaymentMethod>("cash");
  const [cashDropAmount, setCashDropAmount] = useState("");
  const [cashDropReference, setCashDropReference] = useState("");
  const [cashDropNote, setCashDropNote] = useState("");

  // Every staff member can take an order now, not just Waiters — anyone
  // could be holding cash/M-Pesa-substitution money owed to the cashier.
  const waiters = staff;

  const queue: { ticket: Ticket; order: TicketOrder }[] = [];
  for (const ticket of tickets) {
    if (ticket.status !== "open") continue;
    const order = orders[ticket.id];
    if (!order?.billTotals || order.paymentStatus === "paid") continue;
    queue.push({ ticket, order });
  }

  // Tickets that exist but haven't reached "needs_bill" yet — i.e. billing
  // hasn't started for them (no billTotals). The moment a waiter taps
  // "Proceed to Bill" (startBilling sets billTotals), a ticket falls out of
  // this list and appears in `queue` above instead — same trigger as
  // before, just visible one stage earlier now.
  const activeOrders: { ticket: Ticket; order: TicketOrder }[] = [];
  for (const ticket of tickets) {
    if (ticket.status !== "open") continue;
    const order = orders[ticket.id];
    if (!order || order.billTotals) continue;
    activeOrders.push({ ticket, order });
  }
  activeOrders.sort((a, b) => a.ticket.openedAt - b.ticket.openedAt);

  function activeOrderStatus(order: TicketOrder): string {
    if (order.onHold) return "On Hold";
    const items = order.rounds.flatMap((r) => r.items);
    const hasUnsent = items.some((i) => !i.sentToKitchen);
    if (hasUnsent) return "Ordering";
    const sentItems = items.filter((i) => i.sentToKitchen);
    if (sentItems.length === 0) return "Ordering";
    return sentItems.every((i) => i.kitchenReady) ? "Ready" : "Sent to Kitchen";
  }

  function activeOrderStatusClasses(status: string): string {
    if (status === "Ready") return "bg-emerald-50 text-emerald-700";
    if (status === "Sent to Kitchen") return "bg-amber-50 text-amber-700";
    if (status === "On Hold") return "bg-slate-100 text-slate-600";
    return "bg-status-occupied/10 text-status-occupied";
  }

  const query = search.trim().toLowerCase();
  function rowMatches(order: TicketOrder | undefined) {
    if (!query) return true;
    const cyclePayments = paymentsForCurrentCycle(payments, order);
    return cyclePayments.some(
      (p) =>
        p.reference.toLowerCase().includes(query) ||
        (p.customerName ?? "").toLowerCase().includes(query)
    );
  }

  // A completed (paid + closed) ticket disappears from every queue above —
  // this is the only way back to it, and only while actively searching.
  // Matched by the same M-Pesa code / customer name search already used for
  // live tickets, just extended to closed ones too.
  const completedMatches: { payment: Payment; ticket: Ticket; order: TicketOrder }[] = [];
  if (query) {
    for (const payment of payments) {
      const ticket = tickets.find((t) => t.id === payment.ticketId);
      const order = orders[payment.ticketId];
      if (!ticket || ticket.status !== "paid" || !order) continue;
      const matches =
        payment.reference.toLowerCase().includes(query) ||
        (payment.customerName ?? "").toLowerCase().includes(query);
      if (matches) completedMatches.push({ payment, ticket, order });
    }
    completedMatches.sort((a, b) => b.payment.paidAt - a.payment.paidAt);
  }

  const groupOrder: string[] = [];
  const groups = new Map<
    string,
    { waiterId?: string; waiterName: string; rows: typeof queue }
  >();
  for (const row of queue) {
    const key = row.order.waiterId ?? "unassigned";
    if (!groups.has(key)) {
      const waiter = staff.find((m) => m.id === row.order.waiterId);
      groups.set(key, {
        waiterId: row.order.waiterId,
        waiterName: waiter?.name ?? "Unassigned",
        rows: [],
      });
      groupOrder.push(key);
    }
    groups.get(key)!.rows.push(row);
  }

  function cashDraftFor(ticketId: string, recordedCash: number): string {
    return cashDrafts[ticketId] ?? (recordedCash > 0 ? String(recordedCash) : "");
  }

  async function handleComplete(
    ticketId: string,
    waiterId: string | undefined,
    recordedCash: number,
    mpesaAmount: number,
    total: number
  ) {
    const draft = cashDrafts[ticketId];
    const draftAmount = draft !== undefined ? Math.max(0, Number(draft) || 0) : recordedCash;
    const delta = draftAmount - recordedCash;
    if (delta > 0) {
      recordPayment(ticketId, { method: "cash", amount: delta, reference: "Cash drop" });
      // The cashier is entering and taking custody of this cash in the same
      // motion — record it as already dropped/reconciled immediately,
      // rather than making them enter the same figure again in the
      // separate per-waiter Drop reconciliation below.
      if (waiterId) recordCashDrop(waiterId, delta, delta, "cash");
    }
    setCashDrafts((d) => {
      const next = { ...d };
      delete next[ticketId];
      return next;
    });
    if (mpesaAmount + draftAmount < total) return;
    // Clicking Complete here is itself the cashier's verification — this
    // covers the case where an M-Pesa payment already covers the total but
    // never got a confirmation code, so recordPayment deliberately left the
    // order short of "paid" (it can't tell a real transfer from an empty
    // code left blank by mistake).
    let updatedOrder = usePosStore.getState().orders[ticketId];
    if (updatedOrder?.paymentStatus !== "paid") {
      confirmOrderComplete(ticketId);
      updatedOrder = usePosStore.getState().orders[ticketId];
    }
    if (updatedOrder?.paymentStatus === "paid") {
      setFinalizing(true);
      const r = await finalizeReceipt(ticketId);
      setFinalizing(false);
      setReceipt(r);
    }
  }

  function handleReverse(ticketId: string) {
    reverseLastPayment(ticketId);
    setCashDrafts((d) => {
      const next = { ...d };
      delete next[ticketId];
      return next;
    });
  }

  // Reconciliation reporting window — a custom from/to date range,
  // inclusive of both endpoints. Defaults to today on both ends.
  const rangeStart = startOfDay(parseLocalDate(fromDate));
  const rangeEnd = startOfDay(parseLocalDate(toDate)) + 24 * 60 * 60 * 1000;
  function inRange(ts: number): boolean {
    return ts >= rangeStart && ts < rangeEnd;
  }
  const isSingleDay = fromDate === toDate;
  const isCurrentDay = isSingleDay && rangeStart === startOfDay(new Date());
  const rangeLabel = isCurrentDay
    ? "Today"
    : isSingleDay
    ? parseLocalDate(fromDate).toLocaleDateString("en-KE", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : `${parseLocalDate(fromDate).toLocaleDateString("en-KE", {
        day: "numeric",
        month: "short",
      })} – ${parseLocalDate(toDate).toLocaleDateString("en-KE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`;

  const rangePayments = payments.filter((p) => inRange(p.paidAt));
  const rangeDrops = cashDrops.filter((d) => inRange(d.droppedAt));

  function computeWaiterCashFrom(
    waiterId: string,
    srcPayments: Payment[],
    srcDrops: CashDrop[]
  ) {
    const wPayments = srcPayments.filter((p) => p.waiterId === waiterId);
    const mpesaAmount = wPayments
      .filter((p) => p.method === "mpesa")
      .reduce((sum, p) => sum + p.amount, 0);
    const cashAmount = wPayments
      .filter((p) => p.method === "cash")
      .reduce((sum, p) => sum + p.amount, 0);
    // M-Pesa payments sent to the waiter's personal number instead of the
    // till are functionally cash in their hand — they owe a physical drop
    // for these too. A normal till-bound M-Pesa payment never involved
    // physical cash and is excluded entirely.
    const substitutionAmount = wPayments
      .filter((p) => p.method === "mpesa" && p.isCashSubstitution)
      .reduce((sum, p) => sum + p.amount, 0);
    const expectedDrop = cashAmount + substitutionAmount;
    const dropAmount = srcDrops
      .filter((d) => d.waiterId === waiterId)
      .reduce((sum, d) => sum + d.amount, 0);
    return {
      mpesaAmount,
      cashAmount,
      substitutionAmount,
      expectedDrop,
      dropAmount,
      pending: Math.max(0, expectedDrop - dropAmount),
    };
  }

  function computeWaiterCash(waiterId: string) {
    return computeWaiterCashFrom(waiterId, rangePayments, rangeDrops);
  }

  // A cash drop is a real, physical hand-over happening right now, settling
  // whatever the waiter actually owes overall — not just what they sold in
  // whatever day/week the cashier happens to be reviewing. Pending cash
  // never resets at midnight: if it wasn't dropped yesterday, it's still
  // owed today. So both the "how much do they owe right now" figure and
  // the Add Cash Drop dialog always look at the FULL, unscoped history.
  function computeWaiterCashAllTime(waiterId: string) {
    return computeWaiterCashFrom(waiterId, payments, cashDrops);
  }

  // Waiters who actually owe something right now — the set a lumpsum
  // Add Cash Drop covers and splits across.
  function waitersWithPending() {
    return waiters
      .map((w) => ({ waiter: w, pending: computeWaiterCashAllTime(w.id).pending }))
      .filter((r) => r.pending > 0);
  }

  function totalPendingAllWaiters() {
    return waitersWithPending().reduce((sum, r) => sum + r.pending, 0);
  }

  // One row per staff member, merging the period reconciliation figures
  // (scoped to the selected day/week) with the all-time running balance
  // (never scoped — carries forward across days until an actual Cash Drop
  // clears it). Only staff who actually owe something appear here — anyone
  // with nothing pending drops off the board instead of cluttering it.
  const owedRows = waiters
    .filter((w) => !waiterFilter || w.id === waiterFilter)
    .map((waiter) => {
      const period = computeWaiterCash(waiter.id);
      const totalPending = computeWaiterCashAllTime(waiter.id).pending;
      return {
        waiterId: waiter.id,
        waiterName: waiter.name,
        sumAll: period.mpesaAmount + period.cashAmount,
        ...period,
        pendingToday: period.pending,
        totalPending,
      };
    })
    .filter((row) => row.totalPending > 0)
    .sort((a, b) => b.totalPending - a.totalPending);

  const historyRows = rangeDrops
    .filter((d) => !waiterFilter || d.waiterId === waiterFilter)
    .sort((a, b) => b.droppedAt - a.droppedAt)
    .map((drop) => ({
      drop,
      waiterName: staff.find((m) => m.id === drop.waiterId)?.name ?? "Unknown",
    }));

  // Every order paid and closed within the selected window, regardless of
  // whether it's been swept into a cash-drop collection yet. Order-level
  // (unlike Cash Drop History, which is money-in-hand, not order-level),
  // so each row carries a specific payment to reverse.
  const completedRange: { payment: Payment; ticket: Ticket; order: TicketOrder }[] = [];
  for (const payment of payments) {
    if (!inRange(payment.paidAt)) continue;
    const ticket = tickets.find((t) => t.id === payment.ticketId);
    const order = orders[payment.ticketId];
    if (!ticket || ticket.status !== "paid" || !order) continue;
    if (waiterFilter && order.waiterId !== waiterFilter) continue;
    completedRange.push({ payment, ticket, order });
  }
  completedRange.sort((a, b) => b.payment.paidAt - a.payment.paidAt);

  // Opened from a specific waiter's row — locked to that waiter, no picker.
  function openAddCashDropForWaiter(waiterId: string) {
    setCashDropIsLumpsum(false);
    setCashDropWaiterId(waiterId);
    setCashDropMethod("cash");
    const pending = computeWaiterCashAllTime(waiterId).pending;
    setCashDropAmount(pending > 0 ? String(pending) : "");
    setCashDropReference("");
    setCashDropNote("");
    setCashDropOpen(true);
  }

  // Opened from the header button — a single lumpsum covering every waiter
  // with a pending balance at once. Only accepted if it matches the
  // combined total exactly; a partial or per-waiter drop still belongs on
  // that waiter's own row.
  function openAddCashDropLumpsum() {
    setCashDropIsLumpsum(true);
    setCashDropWaiterId("");
    setCashDropMethod("cash");
    const total = totalPendingAllWaiters();
    setCashDropAmount(total > 0 ? String(total) : "");
    setCashDropReference("");
    setCashDropNote("");
    setCashDropOpen(true);
  }

  function jumpReconciliationViewToToday() {
    // The drop is always stamped with the real current time (never
    // backdated to whatever period is being reviewed) — jump the view back
    // to Today so it's immediately visible in History/Summary instead of
    // silently landing outside the currently selected range.
    const today = toISODate(new Date());
    setFromDate(today);
    setToDate(today);
  }

  function submitCashDrop() {
    const amount = Math.max(0, Number(cashDropAmount) || 0);
    if (amount <= 0) return;
    if (cashDropMethod === "mpesa" && !cashDropReference.trim()) return;

    if (cashDropIsLumpsum) {
      const pendingRows = waitersWithPending();
      const expectedTotal = pendingRows.reduce((sum, r) => sum + r.pending, 0);
      // A lumpsum drop must land on the combined total exactly — anything
      // else (more or less) is ambiguous to split across waiters, and
      // belongs on that specific waiter's own row instead.
      if (expectedTotal <= 0 || amount !== expectedTotal) return;
      for (const { waiter, pending } of pendingRows) {
        recordCashDrop(
          waiter.id,
          pending,
          pending,
          cashDropMethod,
          cashDropMethod === "mpesa" ? cashDropReference : undefined,
          undefined
        );
      }
      setCashDropOpen(false);
      jumpReconciliationViewToToday();
      return;
    }

    if (!cashDropWaiterId) return;
    const expectedNow = computeWaiterCashAllTime(cashDropWaiterId).pending;
    // Bringing less than the full amount is a normal partial drop — the
    // waiter can clear the rest later, no explanation needed. Only bringing
    // MORE than expected is the genuinely unusual case worth a note.
    const isOverage = amount > expectedNow;
    if (isOverage && !cashDropNote.trim()) return;
    recordCashDrop(
      cashDropWaiterId,
      amount,
      expectedNow,
      cashDropMethod,
      cashDropMethod === "mpesa" ? cashDropReference : undefined,
      isOverage ? cashDropNote : undefined
    );
    setCashDropOpen(false);
    jumpReconciliationViewToToday();
  }

  return (
    <div className="flex-1 flex flex-col lg:h-full lg:overflow-hidden">
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-warm-200 bg-white">
        <h1 className="text-xl font-black text-slate-900">Cashier</h1>

        <div className="flex flex-wrap items-center gap-3">
          {tab === "reconciliation" && (
            <>
              <div className="inline-flex items-center rounded-full border border-warm-200 bg-warm-50 p-1">
                <button
                  type="button"
                  onClick={() => setReconTab("owed")}
                  className={clsx(
                    "rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors",
                    reconTab === "owed"
                      ? "bg-accent-600 text-white"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Owed Now
                </button>
                <button
                  type="button"
                  onClick={() => setReconTab("history")}
                  className={clsx(
                    "rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors",
                    reconTab === "history"
                      ? "bg-accent-600 text-white"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  History
                </button>
              </div>

              <div className="relative">
                <Calendar
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="date"
                  value={fromDate}
                  max={toDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-full border border-warm-200 bg-white pl-8 pr-3 py-2 text-xs font-extrabold text-slate-600 outline-none focus:border-accent-400"
                />
              </div>
              <span className="text-xs font-extrabold text-slate-400">to</span>
              <div className="relative">
                <Calendar
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-full border border-warm-200 bg-white pl-8 pr-3 py-2 text-xs font-extrabold text-slate-600 outline-none focus:border-accent-400"
                />
              </div>
            </>
          )}

          <div className="inline-flex items-center rounded-full border border-warm-200 bg-warm-50 p-1">
            <button
              type="button"
              onClick={() => setTab("live")}
              className={clsx(
                "rounded-full px-4 py-1.5 text-xs font-extrabold transition-colors",
                tab === "live"
                  ? "bg-accent-600 text-white"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Live Payments
            </button>
            <button
              type="button"
              onClick={() => setTab("reconciliation")}
              className={clsx(
                "rounded-full px-4 py-1.5 text-xs font-extrabold transition-colors",
                tab === "reconciliation"
                  ? "bg-accent-600 text-white"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Reconciliation
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 lg:min-h-0 overflow-y-auto p-6 space-y-6">
        {tab === "live" && (
        <>
        <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-warm-200">
            <h2 className="font-extrabold text-slate-900">
              Orders Awaiting Payment ({queue.length})
            </h2>
            <div className="relative w-full sm:w-72">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by M-Pesa code or customer name"
                className="w-full rounded-full border border-warm-200 bg-white pl-8 pr-8 py-2 text-sm font-semibold outline-none focus:border-accent-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {queue.length === 0 ? (
            <p className="text-slate-400 font-semibold text-center py-12">
              No tickets currently need a bill.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1020px]">
                <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Waiter</th>
                    <th className="text-left px-2 py-3">Order #</th>
                    <th className="text-right px-2 py-3">Amount</th>
                    <th className="text-left px-2 py-3">Code</th>
                    <th className="text-right px-2 py-3">Amount</th>
                    <th className="text-left px-2 py-3">Customer</th>
                    <th className="text-left px-2 py-3">Time</th>
                    <th className="text-center px-2 py-3">Status</th>
                    <th className="text-right px-2 py-3">Drop</th>
                    <th className="text-center px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {groupOrder.map((key) => {
                    const group = groups.get(key)!;
                    const visibleRows = group.rows.filter(({ order }) =>
                      rowMatches(order)
                    );
                    if (visibleRows.length === 0) return null;
                    return (
                      <Fragment key={key}>
                        {visibleRows.map(({ ticket, order }, i) => {
                          const total = order.billTotals!.total;
                          const cyclePayments = paymentsForCurrentCycle(
                            payments,
                            order
                          );
                          const mpesaPayment: Payment | undefined =
                            cyclePayments.find((p) => p.method === "mpesa");
                          const mpesaAmount = cyclePayments
                            .filter((p) => p.method === "mpesa")
                            .reduce((sum, p) => sum + p.amount, 0);
                          const recordedCash = cyclePayments
                            .filter((p) => p.method === "cash")
                            .reduce((sum, p) => sum + p.amount, 0);
                          const draftValue = cashDraftFor(ticket.id, recordedCash);
                          const draftAmount = Math.max(0, Number(draftValue) || 0);
                          const canComplete =
                            mpesaAmount + draftAmount >= total && total > 0;
                          const canReverse = cyclePayments.length > 0;
                          // Status reflects whether an M-Pesa payment has
                          // actually been matched against this ticket yet —
                          // not whether the ticket is fully settled overall
                          // (a cash-only ticket has no M-Pesa leg to clear).
                          const mpesaCleared = mpesaAmount > 0;
                          return (
                            <tr
                              key={ticket.id}
                              className="border-t border-warm-100 align-top"
                            >
                              {i === 0 && (
                                <td
                                  rowSpan={visibleRows.length}
                                  className="px-4 py-3 font-extrabold text-slate-900 align-top border-r border-warm-100"
                                >
                                  {group.waiterName}
                                </td>
                              )}
                              <td className="px-2 py-3 text-slate-700 font-semibold whitespace-nowrap">
                                Order No. {ticket.displayNumber}
                                {ticketSubtitle(ticket) && (
                                  <div className="text-xs text-slate-400 font-semibold">
                                    {ticketSubtitle(ticket)}
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-3 text-right font-black text-slate-900 whitespace-nowrap">
                                {formatKES(total)}
                              </td>
                              <td className="px-2 py-3 text-slate-600 font-semibold">
                                {mpesaPayment?.reference || "—"}
                              </td>
                              <td className="px-2 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                                {mpesaAmount > 0 ? formatKES(mpesaAmount) : "—"}
                              </td>
                              <td className="px-2 py-3 text-slate-600 font-semibold">
                                {mpesaPayment?.customerName || "—"}
                              </td>
                              <td className="px-2 py-3 text-slate-600 font-semibold whitespace-nowrap">
                                {mpesaPayment ? formatTime(mpesaPayment.paidAt) : "—"}
                              </td>
                              <td className="px-2 py-3 text-center">
                                <span
                                  className={clsx(
                                    "inline-flex items-center rounded-full text-[11px] font-extrabold px-2.5 py-1",
                                    mpesaCleared
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                                  )}
                                >
                                  {mpesaCleared ? "Paid" : "Pending"}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-right">
                                <input
                                  type="number"
                                  value={draftValue}
                                  onChange={(e) =>
                                    setCashDrafts((d) => ({
                                      ...d,
                                      [ticket.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="0"
                                  className="w-24 rounded-lg border border-warm-200 px-2 py-1.5 text-right text-sm font-bold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    disabled={!canComplete}
                                    onClick={() =>
                                      handleComplete(
                                        ticket.id,
                                        order.waiterId,
                                        recordedCash,
                                        mpesaAmount,
                                        total
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-full bg-accent-600 hover:bg-accent-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-extrabold px-3.5 py-2"
                                  >
                                    <CheckCircle2 size={13} /> Complete
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canReverse}
                                    onClick={() => handleReverse(ticket.id)}
                                    aria-label="Reverse last payment"
                                    title="Reverse last payment"
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-rose-200 text-rose-600 hover:bg-rose-50 disabled:border-warm-200 disabled:text-slate-300"
                                  >
                                    <RotateCcw size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {query && completedMatches.length > 0 && (
          <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-warm-200">
              <h2 className="font-extrabold text-slate-900">
                Completed Orders Matching &ldquo;{search.trim()}&rdquo; (
                {completedMatches.length})
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Already paid and closed. Reversing sends it back to Orders
                Awaiting Payment.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Waiter</th>
                    <th className="text-left px-2 py-3">Order #</th>
                    <th className="text-left px-2 py-3">Method</th>
                    <th className="text-left px-2 py-3">Code</th>
                    <th className="text-right px-2 py-3">Amount</th>
                    <th className="text-left px-2 py-3">Customer</th>
                    <th className="text-left px-2 py-3">Time</th>
                    <th className="text-center px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {completedMatches.map(({ payment, ticket, order }) => {
                    const waiterName =
                      staff.find((m) => m.id === order.waiterId)?.name ??
                      "Unassigned";
                    return (
                      <tr key={payment.id} className="border-t border-warm-100">
                        <td className="px-4 py-3 font-extrabold text-slate-900">
                          {waiterName}
                        </td>
                        <td className="px-2 py-3 text-slate-700 font-semibold whitespace-nowrap">
                          Order No. {ticket.displayNumber}
                        </td>
                        <td className="px-2 py-3 text-slate-600 font-semibold">
                          {payment.method === "mpesa" ? "M-Pesa" : "Cash"}
                        </td>
                        <td className="px-2 py-3 text-slate-600 font-semibold">
                          {payment.method === "mpesa" ? payment.reference || "—" : "—"}
                        </td>
                        <td className="px-2 py-3 text-right font-black text-slate-900 whitespace-nowrap">
                          {formatKES(payment.amount)}
                        </td>
                        <td className="px-2 py-3 text-slate-600 font-semibold">
                          {payment.customerName || ticket.customerName || "—"}
                        </td>
                        <td className="px-2 py-3 text-slate-600 font-semibold whitespace-nowrap">
                          {formatTime(payment.paidAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => reverseCompletedPayment(payment.id)}
                              aria-label="Reverse this payment and reopen the order"
                              title="Reverse this payment and reopen the order"
                              className="inline-flex items-center gap-1.5 rounded-full border-2 border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-extrabold px-3 py-1.5"
                            >
                              <RotateCcw size={13} /> Reverse
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-warm-200">
            <h2 className="font-extrabold text-slate-900">
              Active Orders — In Progress ({activeOrders.length})
            </h2>
          </div>
          {activeOrders.length === 0 ? (
            <p className="text-slate-400 font-semibold text-center py-12">
              No orders currently in progress.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-5 py-3">Waiter</th>
                    <th className="text-left px-2 py-3">Order #</th>
                    <th className="text-right px-2 py-3">Running Total</th>
                    <th className="text-center px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrders.map(({ ticket, order }) => {
                    const waiterName =
                      staff.find((m) => m.id === order.waiterId)?.name ??
                      "Unassigned";
                    const runningTotal = unbilledOrderTotal(order, vatRate).total;
                    const status = activeOrderStatus(order);
                    return (
                      <tr key={ticket.id} className="border-t border-warm-100">
                        <td className="px-5 py-3 font-extrabold text-slate-900">
                          {waiterName}
                        </td>
                        <td className="px-2 py-3 text-slate-700 font-semibold whitespace-nowrap">
                          Order No. {ticket.displayNumber}
                          {ticketSubtitle(ticket) && (
                            <div className="text-xs text-slate-400 font-semibold">
                              {ticketSubtitle(ticket)}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-3 text-right font-black text-slate-900">
                          {formatKES(runningTotal)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span
                            className={clsx(
                              "inline-flex items-center rounded-full text-[11px] font-extrabold px-2.5 py-1",
                              activeOrderStatusClasses(status)
                            )}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
        )}

        {tab === "reconciliation" && (
        <>
        {reconTab === "owed" ? (
        <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-warm-200">
            <div>
              <h2 className="font-extrabold text-slate-900">
                Cash Owed Per Staff Member
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Bills/Drop columns are scoped to {rangeLabel}. Total Pending
                carries forward day to day, regardless of the period above,
                until it&rsquo;s actually dropped.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={waiterFilter}
                onChange={(e) => setWaiterFilter(e.target.value)}
                className="rounded-full border border-warm-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-600 outline-none focus:border-accent-400"
              >
                <option value="">All Staff</option>
                {waiters.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={openAddCashDropLumpsum}
                disabled={totalPendingAllWaiters() <= 0}
                title={
                  totalPendingAllWaiters() <= 0
                    ? "No staff member currently has a pending balance"
                    : "Record one lumpsum drop covering every staff member's pending balance"
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-600 hover:bg-accent-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-extrabold px-3.5 py-2"
              >
                <Plus size={13} /> Add Cash Drop
              </button>
            </div>
          </div>
          {owedRows.length === 0 ? (
            <p className="text-slate-400 font-semibold text-center py-12">
              Nobody currently owes anything.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[980px]">
                <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-5 py-3">Staff</th>
                    <th className="text-right px-2 py-3">
                      Bills ({rangeLabel})
                    </th>
                    <th className="text-right px-2 py-3">M-Pesa Amount</th>
                    <th className="text-right px-2 py-3">
                      Expected Drop ({rangeLabel})
                    </th>
                    <th className="text-right px-2 py-3">Cash Drop</th>
                    <th className="text-right px-2 py-3">
                      Pending ({rangeLabel})
                    </th>
                    <th className="text-right px-2 py-3">
                      Total Pending (All-Time)
                    </th>
                    <th className="text-center px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {owedRows.map((row) => (
                    <tr key={row.waiterId} className="border-t border-warm-100">
                      <td className="px-5 py-3 font-extrabold text-slate-900">
                        {row.waiterName}
                      </td>
                      <td className="px-2 py-3 text-right font-black text-slate-900">
                        {formatKES(row.sumAll)}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-700">
                        {formatKES(row.mpesaAmount)}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <div className="font-semibold text-slate-700">
                          {formatKES(row.expectedDrop)}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                          Cash: {formatKES(row.cashAmount)} · M-Pesa sub:{" "}
                          {formatKES(row.substitutionAmount)}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-700">
                        {formatKES(row.dropAmount)}
                      </td>
                      <td
                        className={clsx(
                          "px-2 py-3 text-right font-semibold",
                          row.pendingToday > 0 ? "text-amber-600" : "text-slate-400"
                        )}
                      >
                        {formatKES(row.pendingToday)}
                      </td>
                      <td
                        className={clsx(
                          "px-2 py-3 text-right font-extrabold",
                          row.totalPending > 0 ? "text-amber-600" : "text-slate-400"
                        )}
                      >
                        {formatKES(row.totalPending)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => openAddCashDropForWaiter(row.waiterId)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-accent-600 hover:bg-accent-700 text-white text-xs font-extrabold px-3.5 py-1.5"
                        >
                          <Plus size={12} /> Add Cash Drop
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        ) : (
        <>
        <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-warm-200">
            <h2 className="font-extrabold text-slate-900">
              Cash Drop History — {rangeLabel}
            </h2>
          </div>
          {historyRows.length === 0 ? (
            <p className="text-slate-400 font-semibold text-center py-12">
              No cash drops recorded for this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-5 py-3">Date/Time</th>
                    <th className="text-left px-2 py-3">Staff</th>
                    <th className="text-left px-2 py-3">Method</th>
                    <th className="text-left px-2 py-3">Reference</th>
                    <th className="text-right px-2 py-3">Amount</th>
                    <th className="text-center px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map(({ drop, waiterName }) => (
                    <tr key={drop.id} className="border-t border-warm-100">
                      <td className="px-5 py-3 text-slate-600 font-semibold whitespace-nowrap">
                        {formatTime(drop.droppedAt, !isSingleDay)}
                      </td>
                      <td className="px-2 py-3 font-extrabold text-slate-900">
                        {waiterName}
                      </td>
                      <td className="px-2 py-3 text-slate-700 font-semibold">
                        {drop.method === "mpesa" ? "M-Pesa" : "Cash"}
                      </td>
                      <td className="px-2 py-3 text-slate-600 font-semibold">
                        {drop.reference || "—"}
                      </td>
                      <td className="px-2 py-3 text-right font-black text-slate-900">
                        {formatKES(drop.amount)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => deleteCashDrop(drop.id)}
                          aria-label="Delete cash drop"
                          title="Delete cash drop"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-rose-200 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-warm-200">
            <h2 className="font-extrabold text-slate-900">
              Completed Orders — {rangeLabel} ({completedRange.length})
            </h2>
          </div>
          {completedRange.length === 0 ? (
            <p className="text-slate-400 font-semibold text-center py-12">
              No completed orders in this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Waiter</th>
                    <th className="text-left px-2 py-3">Order #</th>
                    <th className="text-left px-2 py-3">Method</th>
                    <th className="text-left px-2 py-3">Code</th>
                    <th className="text-right px-2 py-3">Amount</th>
                    <th className="text-left px-2 py-3">Customer</th>
                    <th className="text-left px-2 py-3">Time</th>
                    <th className="text-center px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {completedRange.map(({ payment, ticket, order }) => {
                    const waiterName =
                      staff.find((m) => m.id === order.waiterId)?.name ??
                      "Unassigned";
                    return (
                      <tr key={payment.id} className="border-t border-warm-100">
                        <td className="px-4 py-3 font-extrabold text-slate-900">
                          {waiterName}
                        </td>
                        <td className="px-2 py-3 text-slate-700 font-semibold whitespace-nowrap">
                          Order No. {ticket.displayNumber}
                        </td>
                        <td className="px-2 py-3 text-slate-600 font-semibold">
                          {payment.method === "mpesa" ? "M-Pesa" : "Cash"}
                        </td>
                        <td className="px-2 py-3 text-slate-600 font-semibold">
                          {payment.method === "mpesa" ? payment.reference || "—" : "—"}
                        </td>
                        <td className="px-2 py-3 text-right font-black text-slate-900 whitespace-nowrap">
                          {formatKES(payment.amount)}
                        </td>
                        <td className="px-2 py-3 text-slate-600 font-semibold">
                          {payment.customerName || ticket.customerName || "—"}
                        </td>
                        <td className="px-2 py-3 text-slate-600 font-semibold whitespace-nowrap">
                          {formatTime(payment.paidAt, !isSingleDay)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => reverseCompletedPayment(payment.id)}
                              aria-label="Reverse this payment and reopen the order"
                              title="Reverse this payment and reopen the order"
                              className="inline-flex items-center gap-1.5 rounded-full border-2 border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-extrabold px-3 py-1.5"
                            >
                              <RotateCcw size={13} /> Reverse
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
        )}
        </>
        )}
      </main>

      {cashDropOpen && (() => {
        const isLumpsum = cashDropIsLumpsum;
        const pendingRows = waitersWithPending();
        const lumpsumExpected = pendingRows.reduce((sum, r) => sum + r.pending, 0);
        const cash = !isLumpsum && cashDropWaiterId ? computeWaiterCashAllTime(cashDropWaiterId) : null;
        const expectedNow = isLumpsum ? lumpsumExpected : cash?.pending ?? 0;
        const counted = Math.max(0, Number(cashDropAmount) || 0);
        const hasAmount = cashDropAmount.trim() !== "";
        const variance = counted - expectedNow;
        // Bringing less than expected is a normal partial drop, not an
        // error — only bringing more than expected is unusual enough to
        // require an explanation. Neither applies to a lumpsum drop, which
        // must match the combined total exactly or not go through at all.
        const isPartial = !isLumpsum && hasAmount && variance < 0;
        const isOverage = !isLumpsum && hasAmount && variance > 0;
        const lumpsumMismatch = isLumpsum && hasAmount && counted !== expectedNow;
        const referenceOk = cashDropMethod === "cash" || cashDropReference.trim() !== "";
        const waiterName = waiters.find((w) => w.id === cashDropWaiterId)?.name ?? "—";
        const canConfirm = isLumpsum
          ? expectedNow > 0 && counted === expectedNow && referenceOk
          : Boolean(cashDropWaiterId) &&
            counted > 0 &&
            referenceOk &&
            (!isOverage || cashDropNote.trim() !== "");
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            onClick={() => setCashDropOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-extrabold text-slate-900">
                  {isLumpsum ? "Add Cash Drop — All Staff" : "Add New Cash Drop"}
                </h3>
                <button
                  type="button"
                  onClick={() => setCashDropOpen(false)}
                  aria-label="Close"
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-slate-500 font-semibold mb-3">
                {isLumpsum
                  ? "One lumpsum drop settling every staff member's pending balance at once — the amount must match the combined total exactly."
                  : "Cash and M-Pesa sent to a staff member’s personal number are combined into one outstanding balance."}
              </p>

              {isLumpsum ? (
                <div className="rounded-lg bg-warm-50 px-3 py-2.5 mb-3">
                  <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">
                    Covers {pendingRows.length} staff member{pendingRows.length === 1 ? "" : "s"}
                  </div>
                  <div className="space-y-1">
                    {pendingRows.map(({ waiter, pending }) => (
                      <div
                        key={waiter.id}
                        className="flex justify-between text-xs font-semibold text-slate-600"
                      >
                        <span>{waiter.name}</span>
                        <span>{formatKES(pending)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                    Staff
                  </label>
                  <div className="mt-1 mb-3 w-full rounded-lg border border-warm-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                    {waiterName}
                  </div>
                </>
              )}

              <div className="rounded-lg bg-warm-50 px-3 py-2.5 mb-4">
                <div className="flex justify-between text-sm font-black text-slate-900">
                  <span>Expected</span>
                  <span>{formatKES(expectedNow)}</span>
                </div>
                {cash && (
                  <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    Cash: {formatKES(cash.cashAmount)} · M-Pesa substitution:{" "}
                    {formatKES(cash.substitutionAmount)}
                  </div>
                )}
              </div>

              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Method
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1 mb-3">
                {CASH_DROP_METHODS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCashDropMethod(id)}
                    className={clsx(
                      "flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 font-extrabold text-sm transition-colors",
                      cashDropMethod === id
                        ? "border-accent-600 bg-accent-50 text-accent-700"
                        : "border-warm-200 text-slate-500 hover:border-accent-300"
                    )}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>

              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Amount being dropped now
              </label>
              <input
                type="number"
                autoFocus
                value={cashDropAmount}
                onChange={(e) => setCashDropAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              {cashDropMethod === "mpesa" && (
                <div className="mt-3">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                    Reference code
                  </label>
                  <input
                    value={cashDropReference}
                    onChange={(e) => setCashDropReference(e.target.value)}
                    placeholder="e.g. QGH7XJ2K"
                    className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400"
                  />
                </div>
              )}

              {isPartial && (
                <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold px-3 py-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  Partial drop — KES{" "}
                  {Math.abs(variance).toLocaleString("en-KE")} will still be
                  pending after this.
                </div>
              )}

              {isOverage && (
                <div className="mt-3">
                  <div className="flex items-start gap-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold px-3 py-2 mb-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    KES {variance.toLocaleString("en-KE")} over expected — a
                    note is required to record this.
                  </div>
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                    Note
                  </label>
                  <textarea
                    value={cashDropNote}
                    onChange={(e) => setCashDropNote(e.target.value)}
                    placeholder="e.g. Customer overpaid and said keep the change"
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent-400 resize-none"
                  />
                </div>
              )}

              {lumpsumMismatch && (
                <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold px-3 py-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  A lumpsum drop must match the total owed exactly (
                  {formatKES(expectedNow)}). For a different amount, use
                  &ldquo;Add Cash Drop&rdquo; on that specific staff
                  member&rsquo;s row instead.
                </div>
              )}

              <button
                type="button"
                disabled={!canConfirm}
                onClick={submitCashDrop}
                className="w-full mt-4 flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
              >
                <Banknote size={16} /> Confirm Cash Drop
              </button>
            </div>
          </div>
        );
      })()}

      {finalizing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50">
          <div className="rounded-xl bg-white px-6 py-5 flex items-center gap-2 font-extrabold text-slate-700">
            <CheckCircle2 size={20} className="text-status-free" /> Finalizing
            receipt…
          </div>
        </div>
      )}

      {receipt && (
        <PaymentSuccessModal
          label={receipt.ticketLabel}
          total={receipt.total}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
