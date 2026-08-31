"use client";

import { Fragment, useState } from "react";
import clsx from "clsx";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  RotateCcw,
  Search,
  Smartphone,
  Trash2,
  X,
  Plus,
} from "lucide-react";
import { usePosStore, paymentsForCurrentCycle } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import { PaymentSuccessModal } from "@/components/billing/PaymentSuccessModal";
import type { Payment, PaymentMethod, Receipt, Ticket, TicketOrder } from "@/lib/types";

const COLLECTION_METHODS: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "mpesa", label: "M-Pesa", icon: Smartphone },
];

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isToday(ts: number): boolean {
  return new Date(ts).toDateString() === new Date().toDateString();
}

export default function CashierPage() {
  const tickets = usePosStore((s) => s.tickets);
  const orders = usePosStore((s) => s.orders);
  const staff = usePosStore((s) => s.staff);
  const payments = usePosStore((s) => s.payments);
  const cashDrops = usePosStore((s) => s.cashDrops);
  const recordPayment = usePosStore((s) => s.recordPayment);
  const finalizeReceipt = usePosStore((s) => s.finalizeReceipt);
  const reverseLastPayment = usePosStore((s) => s.reverseLastPayment);
  const recordCashDrop = usePosStore((s) => s.recordCashDrop);
  const deleteCashDrop = usePosStore((s) => s.deleteCashDrop);

  const [tab, setTab] = useState<"live" | "reconciliation">("live");
  const [search, setSearch] = useState("");
  const [cashDrafts, setCashDrafts] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [waiterFilter, setWaiterFilter] = useState("");

  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionWaiterId, setCollectionWaiterId] = useState("");
  const [collectionMethod, setCollectionMethod] = useState<PaymentMethod>("cash");
  const [collectionAmount, setCollectionAmount] = useState("");
  const [collectionReference, setCollectionReference] = useState("");
  const [collectionNote, setCollectionNote] = useState("");

  const waiters = staff.filter((m) => m.role === "Waiter");

  const queue: { ticket: Ticket; order: TicketOrder }[] = [];
  for (const ticket of tickets) {
    if (ticket.status !== "open") continue;
    const order = orders[ticket.id];
    if (!order?.billTotals || order.paymentStatus === "paid") continue;
    queue.push({ ticket, order });
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
    const updatedOrder = usePosStore.getState().orders[ticketId];
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

  // Summary table: today's totals per waiter.
  const todaysPayments = payments.filter((p) => isToday(p.paidAt));
  const todaysDrops = cashDrops.filter((d) => isToday(d.droppedAt));

  function computeWaiterCash(waiterId: string) {
    const wPayments = todaysPayments.filter((p) => p.waiterId === waiterId);
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
    const dropAmount = todaysDrops
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

  const summaryWaiterIds = Array.from(
    new Set<string>([
      ...(todaysPayments
        .map((p) => p.waiterId)
        .filter((id): id is string => Boolean(id)) as string[]),
      ...todaysDrops.map((d) => d.waiterId),
    ])
  );
  const summaryRows = summaryWaiterIds.map((waiterId) => {
    const waiter = staff.find((m) => m.id === waiterId);
    const cash = computeWaiterCash(waiterId);
    return {
      waiterId,
      waiterName: waiter?.name ?? "Unknown",
      sumAll: cash.mpesaAmount + cash.cashAmount,
      ...cash,
    };
  });
  const filteredSummaryRows = waiterFilter
    ? summaryRows.filter((r) => r.waiterId === waiterFilter)
    : summaryRows;

  const historyRows = todaysDrops
    .filter((d) => !waiterFilter || d.waiterId === waiterFilter)
    .sort((a, b) => b.droppedAt - a.droppedAt)
    .map((drop) => ({
      drop,
      waiterName: staff.find((m) => m.id === drop.waiterId)?.name ?? "Unknown",
    }));

  function openAddCollection() {
    const initialWaiterId = waiterFilter || waiters[0]?.id || "";
    setCollectionWaiterId(initialWaiterId);
    setCollectionMethod("cash");
    const pending = initialWaiterId ? computeWaiterCash(initialWaiterId).pending : 0;
    setCollectionAmount(pending > 0 ? String(pending) : "");
    setCollectionReference("");
    setCollectionNote("");
    setCollectionOpen(true);
  }

  function selectCollectionWaiter(waiterId: string) {
    setCollectionWaiterId(waiterId);
    const pending = computeWaiterCash(waiterId).pending;
    setCollectionAmount(pending > 0 ? String(pending) : "");
    setCollectionNote("");
  }

  function submitCollection() {
    if (!collectionWaiterId) return;
    const amount = Math.max(0, Number(collectionAmount) || 0);
    if (amount <= 0) return;
    if (collectionMethod === "mpesa" && !collectionReference.trim()) return;
    const expectedNow = computeWaiterCash(collectionWaiterId).pending;
    // Bringing less than the full amount is a normal partial drop — the
    // waiter can clear the rest later, no explanation needed. Only bringing
    // MORE than expected is the genuinely unusual case worth a note.
    const isOverage = amount > expectedNow;
    if (isOverage && !collectionNote.trim()) return;
    recordCashDrop(
      collectionWaiterId,
      amount,
      expectedNow,
      collectionMethod,
      collectionMethod === "mpesa" ? collectionReference : undefined,
      isOverage ? collectionNote : undefined
    );
    setCollectionOpen(false);
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 flex items-center justify-between px-6 border-b border-warm-200 bg-white">
        <h1 className="text-xl font-black text-slate-900">Cashier</h1>
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
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {tab === "live" && (
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
                                {ticket.locationNote && (
                                  <div className="text-xs text-slate-400 font-semibold">
                                    {ticket.locationNote}
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
        )}

        {tab === "reconciliation" && (
        <>
        <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-warm-200">
            <h2 className="font-extrabold text-slate-900">
              Summary — Today&rsquo;s Cash Per Waiter
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={waiterFilter}
                onChange={(e) => setWaiterFilter(e.target.value)}
                className="rounded-full border border-warm-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-600 outline-none focus:border-accent-400"
              >
                <option value="">All Waiters</option>
                {waiters.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={openAddCollection}
                disabled={waiters.length === 0}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-600 hover:bg-accent-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-extrabold px-3.5 py-2"
              >
                <Plus size={13} /> Add Collection
              </button>
            </div>
          </div>
          {filteredSummaryRows.length === 0 ? (
            <p className="text-slate-400 font-semibold text-center py-12">
              No collections recorded yet today.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-5 py-3">Waiter</th>
                    <th className="text-right px-2 py-3">
                      Sum of all bills (cash &amp; M-Pesa)
                    </th>
                    <th className="text-right px-2 py-3">M-Pesa Amount</th>
                    <th className="text-right px-2 py-3">Expected Drop</th>
                    <th className="text-right px-2 py-3">Cash Drop</th>
                    <th className="text-right px-5 py-3">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSummaryRows.map((row) => (
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
                          "px-5 py-3 text-right font-extrabold",
                          row.pending > 0 ? "text-amber-600" : "text-slate-400"
                        )}
                      >
                        {formatKES(row.pending)}
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
              Collections History — Today
            </h2>
          </div>
          {historyRows.length === 0 ? (
            <p className="text-slate-400 font-semibold text-center py-12">
              No collections recorded yet today.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-warm-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-5 py-3">Date/Time</th>
                    <th className="text-left px-2 py-3">Waiter</th>
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
                        {formatTime(drop.droppedAt)}
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
                          aria-label="Delete collection"
                          title="Delete collection"
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
        </>
        )}
      </main>

      {collectionOpen && (() => {
        const cash = collectionWaiterId ? computeWaiterCash(collectionWaiterId) : null;
        const expectedNow = cash?.pending ?? 0;
        const counted = Math.max(0, Number(collectionAmount) || 0);
        const hasAmount = collectionAmount.trim() !== "";
        const variance = counted - expectedNow;
        // Bringing less than expected is a normal partial drop, not an
        // error — only bringing more than expected is unusual enough to
        // require an explanation.
        const isPartial = hasAmount && variance < 0;
        const isOverage = hasAmount && variance > 0;
        const referenceOk = collectionMethod === "cash" || collectionReference.trim() !== "";
        const canConfirm =
          Boolean(collectionWaiterId) &&
          counted > 0 &&
          referenceOk &&
          (!isOverage || collectionNote.trim() !== "");
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            onClick={() => setCollectionOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-extrabold text-slate-900">Add New Collection</h3>
                <button
                  type="button"
                  onClick={() => setCollectionOpen(false)}
                  aria-label="Close"
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-slate-500 font-semibold mb-3">
                Cash and M-Pesa sent to a waiter&rsquo;s personal number are
                combined into one outstanding balance.
              </p>

              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Waiter
              </label>
              <select
                value={collectionWaiterId}
                onChange={(e) => selectCollectionWaiter(e.target.value)}
                className="mt-1 mb-3 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400"
              >
                <option value="" disabled>
                  Select a waiter
                </option>
                {waiters.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>

              {cash && (
                <div className="rounded-lg bg-warm-50 px-3 py-2.5 mb-4">
                  <div className="flex justify-between text-sm font-black text-slate-900">
                    <span>Expected</span>
                    <span>{formatKES(expectedNow)}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    Cash: {formatKES(cash.cashAmount)} · M-Pesa substitution:{" "}
                    {formatKES(cash.substitutionAmount)}
                  </div>
                </div>
              )}

              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Method
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1 mb-3">
                {COLLECTION_METHODS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCollectionMethod(id)}
                    className={clsx(
                      "flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 font-extrabold text-sm transition-colors",
                      collectionMethod === id
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
                value={collectionAmount}
                onChange={(e) => setCollectionAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              {collectionMethod === "mpesa" && (
                <div className="mt-3">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                    Reference code
                  </label>
                  <input
                    value={collectionReference}
                    onChange={(e) => setCollectionReference(e.target.value)}
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
                    value={collectionNote}
                    onChange={(e) => setCollectionNote(e.target.value)}
                    placeholder="e.g. Customer overpaid and said keep the change"
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent-400 resize-none"
                  />
                </div>
              )}

              <button
                type="button"
                disabled={!canConfirm}
                onClick={submitCollection}
                className="w-full mt-4 flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
              >
                <Banknote size={16} /> Confirm Collection
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
