"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { usePosStore } from "@/lib/store";
import {
  TICKET_STATUS_CONFIG,
  avatarColorFor,
  initials,
  ticketDisplayStatus,
  type TicketDisplayStatus,
} from "./ticketStatus";
import type { StaffMember, Ticket, TicketOrder } from "@/lib/types";

interface Row {
  ticket: Ticket;
  order: TicketOrder;
  status: TicketDisplayStatus;
}

interface WaiterGroup {
  waiter: StaffMember;
  rows: Row[];
}

export function AllTicketsGrid() {
  const router = useRouter();
  const tickets = usePosStore((s) => s.tickets);
  const orders = usePosStore((s) => s.orders);
  const staff = usePosStore((s) => s.staff);
  const cancelEmptyTickets = usePosStore((s) => s.cancelEmptyTickets);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(staff.map((m) => m.id))
  );

  // An order that never got a single item added to it isn't a real order —
  // sweep those away whenever this board is viewed.
  useEffect(() => {
    cancelEmptyTickets();
  }, [cancelEmptyTickets]);

  const openTickets = tickets.filter((t) => t.status === "open");
  const waiterIds = Array.from(new Set(openTickets.map((t) => t.waiterId)));

  const groups: WaiterGroup[] = waiterIds
    .map((waiterId) => {
      const waiter = staff.find((m) => m.id === waiterId);
      if (!waiter) return null;
      const rows: Row[] = openTickets
        .filter((t) => t.waiterId === waiterId)
        .map((ticket) => {
          const order = orders[ticket.id];
          if (!order || !order.rounds.some((round) => round.items.length > 0)) {
            return null;
          }
          return { ticket, order, status: ticketDisplayStatus(order) };
        })
        .filter((r): r is Row => Boolean(r))
        .sort((a, b) => a.ticket.displayNumber - b.ticket.displayNumber);
      return { waiter, rows };
    })
    .filter((g): g is WaiterGroup => Boolean(g))
    .sort((a, b) => b.rows.length - a.rows.length);

  function toggleExpanded(waiterId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(waiterId)) next.delete(waiterId);
      else next.add(waiterId);
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <p className="text-slate-400 font-semibold text-center py-16">
        No one currently has any open tickets.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {groups.map(({ waiter, rows }) => {
        const isExpanded = expanded.has(waiter.id);
        const counts = rows.reduce(
          (acc, r) => {
            acc[r.status] += 1;
            return acc;
          },
          { "in-progress": 0, ready: 0, "needs-bill": 0, held: 0 } as Record<
            TicketDisplayStatus,
            number
          >
        );

        return (
          <div
            key={waiter.id}
            className="rounded-2xl border border-warm-200 bg-white shadow-sm overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleExpanded(waiter.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-warm-50 transition-colors"
            >
              <div
                className={clsx(
                  "h-11 w-11 shrink-0 rounded-full flex items-center justify-center text-white font-extrabold text-sm",
                  avatarColorFor(waiter.id)
                )}
              >
                {initials(waiter.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-slate-900 truncate">
                  {waiter.name}
                </div>
                <div className="text-xs font-bold text-slate-400">{waiter.role}</div>
              </div>
              <div className="text-center shrink-0">
                <div className="text-2xl font-black text-slate-900 leading-none">
                  {rows.length}
                </div>
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                  Orders
                </div>
              </div>
              <ChevronDown
                size={16}
                className={clsx(
                  "text-slate-400 transition-transform shrink-0",
                  isExpanded && "rotate-180"
                )}
              />
            </button>

            <div className="flex flex-wrap gap-1.5 px-4 pb-3">
              {(["in-progress", "ready", "needs-bill", "held"] as const).map((key) => {
                const cfg = TICKET_STATUS_CONFIG[key];
                return counts[key] > 0 ? (
                  <span
                    key={key}
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-full text-[11px] font-extrabold px-2.5 py-1",
                      cfg.chip
                    )}
                  >
                    {cfg.icon ? (
                      <cfg.icon size={12} />
                    ) : (
                      <span className={clsx("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                    )}
                    {counts[key]} {cfg.label}
                  </span>
                ) : null;
              })}
            </div>

            {isExpanded && (
              <div className="border-t border-warm-200 divide-y divide-warm-100">
                {rows.map(({ ticket, status }) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => router.push(`/ticket/${ticket.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-warm-50 transition-colors"
                  >
                    <span className="rounded-lg bg-warm-100 text-slate-700 text-xs font-extrabold px-2 py-1 shrink-0">
                      Order No. {ticket.displayNumber}
                    </span>
                    {ticket.locationNote && (
                      <span className="text-xs font-bold text-slate-400 truncate">
                        {ticket.locationNote}
                      </span>
                    )}
                    <span className="flex-1" />
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 rounded-full text-[11px] font-extrabold px-2.5 py-1 shrink-0",
                        TICKET_STATUS_CONFIG[status].chip
                      )}
                    >
                      {TICKET_STATUS_CONFIG[status].icon ? (
                        (() => {
                          const Icon = TICKET_STATUS_CONFIG[status].icon!;
                          return <Icon size={12} />;
                        })()
                      ) : (
                        <span
                          className={clsx(
                            "h-1.5 w-1.5 rounded-full",
                            TICKET_STATUS_CONFIG[status].dot
                          )}
                        />
                      )}
                      {TICKET_STATUS_CONFIG[status].label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
