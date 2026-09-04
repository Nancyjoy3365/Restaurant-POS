"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import { usePosStore } from "@/lib/store";
import {
  KITCHEN_URGENCY_CONFIG,
  KITCHEN_URGENCY_LEGEND,
  urgencyFor,
  elapsedLabel,
} from "@/components/kitchen/kitchenUrgency";
import type { MenuCategory, OrderLineItem, Ticket, TicketOrder } from "@/lib/types";

// Only Main/Extra dishes actually come out of the kitchen — Drinks/Water/
// Juice are poured, not cooked, so they're tracked in their own column
// rather than mixed into the kitchen's prep checklist. Packaging rides
// along with whichever food it's boxing up.
const DRINK_CATEGORIES = new Set<MenuCategory>(["Drinks", "Water", "Juice"]);

function isDrink(category: MenuCategory | undefined): boolean {
  return category ? DRINK_CATEGORIES.has(category) : false;
}

interface KitchenRow {
  ticket: Ticket;
  order: TicketOrder;
  foodItems: OrderLineItem[];
  drinkItems: OrderLineItem[];
  sentAt: number;
}

export default function KitchenDisplayPage() {
  const tickets = usePosStore((s) => s.tickets);
  const orders = usePosStore((s) => s.orders);
  const staff = usePosStore((s) => s.staff);
  const menu = usePosStore((s) => s.menu);
  const toggleItemReady = usePosStore((s) => s.toggleItemReady);
  const markAllItemsReady = usePosStore((s) => s.markAllItemsReady);

  // The ticket list itself is already reactive via the store subscription —
  // only the elapsed-time text needs a periodic nudge to keep advancing.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const rows: KitchenRow[] = tickets
    .filter((t) => t.status === "open")
    .map((ticket) => {
      const order = orders[ticket.id];
      if (!order?.onHold) return null;
      const items = order.rounds
        .flatMap((r) => r.items)
        .filter((i) => i.sentToKitchen);
      if (items.length === 0) return null;
      const foodItems = items.filter(
        (i) => !isDrink(menu.find((m) => m.id === i.menuItemId)?.category)
      );
      const drinkItems = items.filter((i) =>
        isDrink(menu.find((m) => m.id === i.menuItemId)?.category)
      );
      const sentAt = Math.min(
        ...order.rounds.filter((r) => r.sentAt).map((r) => r.sentAt!)
      );
      return {
        ticket,
        order,
        foodItems,
        drinkItems,
        sentAt: Number.isFinite(sentAt) ? sentAt : ticket.openedAt,
      };
    })
    .filter((r): r is KitchenRow => Boolean(r))
    .sort((a, b) => a.sentAt - b.sentAt);

  return (
    <div className="flex-1 flex flex-col lg:h-full lg:overflow-hidden">
      <header className="shrink-0 min-h-16 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3 border-b border-warm-200 bg-white">
        <div>
          <h1 className="text-base lg:text-xl font-black text-slate-900 whitespace-nowrap">
            Kitchen Display
          </h1>
          <p className="text-[11px] lg:text-xs font-semibold text-slate-400">
            {rows.length} active ticket{rows.length === 1 ? "" : "s"} ·
            updates live as orders come in
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {KITCHEN_URGENCY_LEGEND.map((key) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className={clsx(
                  "h-2.5 w-2.5 lg:h-3 lg:w-3 rounded-full shrink-0",
                  KITCHEN_URGENCY_CONFIG[key].dot
                )}
              />
              <span className="text-[11px] lg:text-xs font-bold text-slate-600 whitespace-nowrap">
                {KITCHEN_URGENCY_CONFIG[key].label}
              </span>
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1 lg:min-h-0 overflow-y-auto p-6">
        {rows.length === 0 ? (
          <p className="text-slate-400 font-semibold text-center py-16">
            No tickets currently need the kitchen&rsquo;s attention.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map(({ ticket, foodItems, drinkItems, sentAt }) => {
              const waiter = staff.find((m) => m.id === ticket.waiterId);
              const elapsed = now - sentAt;
              const urgency = urgencyFor(elapsed);
              const cfg = KITCHEN_URGENCY_CONFIG[urgency];
              const allItems = [...foodItems, ...drinkItems];
              const allReady = allItems.every((i) => i.kitchenReady);

              return (
                <div
                  key={ticket.id}
                  className={clsx(
                    "rounded-2xl border border-warm-200 border-t-4 bg-white shadow-sm overflow-hidden",
                    cfg.border
                  )}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-warm-200">
                    <div>
                      <div className="text-sm lg:text-base font-extrabold text-slate-900">
                        Order #{ticket.displayNumber}
                      </div>
                      <div className="text-[11px] lg:text-xs font-bold text-slate-400">
                        {waiter?.name ?? "Unassigned"}
                      </div>
                    </div>
                    <span
                      className={clsx(
                        "rounded-full text-[10px] lg:text-[11px] font-extrabold px-2.5 py-1",
                        cfg.badge
                      )}
                    >
                      {elapsedLabel(elapsed)}
                    </span>
                  </div>

                  {foodItems.length > 0 && (
                    <div>
                      <div className="px-4 pt-2.5 pb-1 text-[9px] lg:text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                        Food
                      </div>
                      <div className="divide-y divide-warm-100">
                        {foodItems.map((item) => (
                          <KitchenItemRow
                            key={item.id}
                            item={item}
                            onToggle={() => toggleItemReady(ticket.id, item.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {drinkItems.length > 0 && (
                    <div className="border-t border-warm-200">
                      <div className="px-4 pt-2.5 pb-1 text-[9px] lg:text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                        Drinks
                      </div>
                      <div className="divide-y divide-warm-100">
                        {drinkItems.map((item) => (
                          <KitchenItemRow
                            key={item.id}
                            item={item}
                            onToggle={() => toggleItemReady(ticket.id, item.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3">
                    <button
                      type="button"
                      disabled={allReady}
                      onClick={() => markAllItemsReady(ticket.id)}
                      className="w-full rounded-xl bg-status-free hover:opacity-90 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm lg:text-base font-extrabold py-2.5 transition-colors"
                    >
                      Mark All Ready
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function KitchenItemRow({
  item,
  onToggle,
}: {
  item: OrderLineItem;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-warm-50 transition-colors"
    >
      <span className="h-5 w-5 lg:h-6 lg:w-6 shrink-0 flex items-center justify-center rounded-full bg-slate-900 text-white text-[10px] lg:text-xs font-black">
        {item.qty}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm lg:text-base font-bold text-slate-900 truncate">
          {item.name}
        </span>
        {item.note && (
          <span className="block text-[11px] lg:text-xs font-semibold text-accent-600 truncate">
            {item.note}
          </span>
        )}
      </span>
      <span
        className={clsx(
          "h-5 w-5 lg:h-6 lg:w-6 shrink-0 flex items-center justify-center rounded-md border-2 transition-colors",
          item.kitchenReady
            ? "bg-status-free border-status-free text-white"
            : "border-warm-200"
        )}
      >
        {item.kitchenReady && <Check size={13} strokeWidth={3} />}
      </span>
    </button>
  );
}
