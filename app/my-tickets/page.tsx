"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Plus, PauseCircle, X } from "lucide-react";
import { usePosStore, getOrderTotal } from "@/lib/store";
import { formatKES, flattenOrderItems } from "@/lib/utils";
import { TICKET_STATUS_CONFIG, TICKET_VIEW_LEGEND, ticketDisplayStatus } from "@/components/tickets/ticketStatus";
import type { Ticket, TicketOrder } from "@/lib/types";

interface MyTicketRow {
  ticket: Ticket;
  order: TicketOrder;
}

export default function MyTicketsPage() {
  const router = useRouter();
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const tickets = usePosStore((s) => s.tickets);
  const orders = usePosStore((s) => s.orders);
  const createTicket = usePosStore((s) => s.createTicket);

  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [locationNote, setLocationNote] = useState("");

  // Strictly scoped to tickets.waiter_id === current_staff.id — never
  // grouped or inferred from anything else. A colleague's ticket never
  // appears here, even in passing.
  const rows: MyTicketRow[] = tickets
    .filter((t) => t.status === "open" && t.waiterId === currentStaffId)
    .map((t) => ({ ticket: t, order: orders[t.id] }))
    .filter((r): r is MyTicketRow => Boolean(r.order))
    .sort((a, b) => a.ticket.displayNumber - b.ticket.displayNumber);

  function handleCreateTicket() {
    const newId = createTicket(locationNote);
    setNewTicketOpen(false);
    setLocationNote("");
    router.push(`/ticket/${newId}`);
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="min-h-16 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3 border-b border-warm-200 bg-white">
        <div>
          <h1 className="text-xl font-black text-slate-900 whitespace-nowrap">
            My Orders
          </h1>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            {TICKET_VIEW_LEGEND.map((key) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className={`h-3 w-3 rounded-full shrink-0 ${TICKET_STATUS_CONFIG[key].dot}`}
                />
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                  {TICKET_STATUS_CONFIG[key].label}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setNewTicketOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-accent-600 hover:bg-accent-700 text-white text-sm font-extrabold px-4 py-2.5"
          >
            <Plus size={16} strokeWidth={3} /> New Order
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {rows.length === 0 ? (
          <p className="text-slate-400 font-semibold text-center py-16">
            You have no open orders right now — tap &ldquo;New Order&rdquo; to start one.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map(({ ticket, order }) => {
              const billTotals = order.billTotals ?? getOrderTotal(order);
              const lines = flattenOrderItems(order);
              const itemCount = lines.reduce((sum, { item }) => sum + item.qty, 0);
              const status = ticketDisplayStatus(order);
              const cfg = TICKET_STATUS_CONFIG[status];

              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => router.push(`/ticket/${ticket.id}`)}
                  className="text-left rounded-2xl border border-warm-200 bg-white shadow-sm overflow-hidden hover:border-accent-300 transition-colors"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-warm-200">
                    <div>
                      <div className="font-extrabold text-slate-900">
                        Order No. {ticket.displayNumber}
                      </div>
                      {ticket.locationNote && (
                        <div className="text-xs font-bold text-slate-400 truncate max-w-[10rem]">
                          {ticket.locationNote}
                        </div>
                      )}
                    </div>
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 rounded-full text-[11px] font-extrabold px-2.5 py-1",
                        cfg.chip
                      )}
                    >
                      <span className={clsx("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                      {cfg.label}
                    </span>
                  </div>

                  <div className="px-4 py-3 space-y-1">
                    {lines.length === 0 ? (
                      <p className="text-xs text-slate-400 font-semibold">
                        No items yet.
                      </p>
                    ) : (
                      lines.slice(0, 4).map(({ item }) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs font-semibold text-slate-600"
                        >
                          <span className="truncate pr-2">
                            {item.qty}× {item.name}
                          </span>
                        </div>
                      ))
                    )}
                    {lines.length > 4 && (
                      <p className="text-xs font-semibold text-slate-400">
                        + {lines.length - 4} more item{lines.length - 4 === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between px-4 py-3 border-t border-warm-200 bg-warm-50">
                    <span className="text-xs font-bold text-slate-500">
                      {itemCount} item{itemCount === 1 ? "" : "s"}
                    </span>
                    <span className="font-black text-slate-900">
                      {formatKES(billTotals.total)}
                    </span>
                  </div>

                  {order.onHold && (
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 text-[11px] font-extrabold">
                      <PauseCircle size={12} /> On Hold — being processed
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>

      {newTicketOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setNewTicketOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-extrabold text-slate-900">New Order</h3>
              <button
                type="button"
                onClick={() => setNewTicketOpen(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 font-semibold mb-4">
              Optional — a quick note so kitchen staff or a covering waiter
              can find this group physically (e.g. &ldquo;by the
              window&rdquo;).
            </p>
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Location note
            </label>
            <input
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              placeholder="e.g. Corner booth by the window"
              autoFocus
              className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400"
            />
            <button
              type="button"
              onClick={handleCreateTicket}
              className="w-full mt-4 flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 text-white font-extrabold py-3"
            >
              <Plus size={16} strokeWidth={3} /> Start Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
