"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Minus,
  Plus,
  Trash2,
  Layers,
  PauseCircle,
  AlertCircle,
  ChefHat,
} from "lucide-react";
import { usePosStore, getOrderTotal, MAX_HELD_ORDERS_PER_WAITER } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import { FoodImage } from "@/components/shared/FoodImage";

export function CartPanel({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const order = usePosStore((s) => s.orders[ticketId]);
  const menu = usePosStore((s) => s.menu);
  const updateItemQty = usePosStore((s) => s.updateItemQty);
  const removeItem = usePosStore((s) => s.removeItem);
  const addRound = usePosStore((s) => s.addRound);
  const startBilling = usePosStore((s) => s.startBilling);
  const sendRoundToKitchen = usePosStore((s) => s.sendRoundToKitchen);
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const heldOrderCountForWaiter = usePosStore((s) => s.heldOrderCountForWaiter);
  const [holdBlocked, setHoldBlocked] = useState(false);

  const itemCount =
    order?.rounds.reduce(
      (sum, r) => sum + r.items.reduce((s2, i) => s2 + i.qty, 0),
      0
    ) ?? 0;

  const { subtotal, vat, total } = getOrderTotal(order);
  const isHeld = order?.onHold ?? false;

  function handleProceedToBill() {
    startBilling(ticketId);
    router.push(`/billing/${ticketId}`);
  }

  function handleSendToKitchen() {
    if (!order) return;
    const latestRoundId = order.rounds[order.rounds.length - 1]?.id;
    if (!latestRoundId) return;
    if (
      !isHeld &&
      heldOrderCountForWaiter(currentStaffId) >= MAX_HELD_ORDERS_PER_WAITER
    ) {
      setHoldBlocked(true);
      return;
    }
    // Sending to kitchen automatically puts the order on hold — being
    // processed — and clears the working list by starting a fresh round on
    // this same ticket, ready for the next course.
    setHoldBlocked(false);
    sendRoundToKitchen(ticketId, latestRoundId);
  }

  return (
    <aside className="flex flex-col w-full lg:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-warm-200 bg-white lg:h-full">
      <div className="flex items-center justify-between px-4 py-4 border-b border-warm-200">
        <div>
          <h2 className="font-extrabold text-lg text-slate-900">
            Order ({itemCount} item{itemCount === 1 ? "" : "s"})
          </h2>
          {isHeld && (
            <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-extrabold px-2.5 py-0.5">
              <PauseCircle size={12} /> On Hold — being processed
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => addRound(ticketId)}
          className="flex items-center gap-1.5 rounded-full border-2 border-accent-300 text-accent-700 hover:bg-accent-50 text-xs font-extrabold px-3.5 py-2"
        >
          <Layers size={14} /> Add Item
        </button>
      </div>

      <div className="max-h-[45vh] lg:max-h-none lg:flex-1 lg:min-h-0 overflow-y-auto px-4 py-3 space-y-4">
        {!order || itemCount === 0 ? (
          <p className="text-sm text-slate-400 font-semibold text-center py-10">
            No items yet — add from the menu.
          </p>
        ) : (
          order.rounds.map(
            (round) =>
              round.items.length > 0 && (
                <div key={round.id}>
                  <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mb-1.5">
                    Round {round.index}
                  </div>
                  <div className="space-y-2">
                    {round.items.map((item) => {
                      const addOnTotal = item.addOns.reduce(
                        (s, a) => s + a.price,
                        0
                      );
                      const lineTotal = (item.price + addOnTotal) * item.qty;
                      const menuItem = menu.find((m) => m.id === item.menuItemId);
                      return (
                        <div
                          key={item.id}
                          className="flex gap-3 rounded-xl border border-warm-200 bg-warm-50 p-2.5"
                        >
                          <FoodImage
                            imageUrl={menuItem?.imageUrl}
                            category={menuItem?.category ?? "Mains"}
                            name={item.name}
                            className="h-14 w-14 rounded-lg shrink-0"
                            emojiClassName="text-xl"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm font-extrabold text-slate-900 truncate">
                                {item.name}
                              </div>
                              <span className="text-sm font-extrabold text-slate-900 whitespace-nowrap">
                                {formatKES(lineTotal)}
                              </span>
                            </div>
                            {(item.spiceLevel || item.addOns.length > 0) && (
                              <div className="text-[11px] text-slate-500 font-semibold truncate">
                                {[
                                  item.spiceLevel,
                                  ...item.addOns.map((a) => a.name),
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            )}
                            <div className="mt-1.5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateItemQty(ticketId, item.id, item.qty - 1)
                                  }
                                  className="h-7 w-7 flex items-center justify-center rounded-full bg-white border border-warm-200 text-slate-600 hover:border-accent-300"
                                >
                                  <Minus size={13} />
                                </button>
                                <span className="text-sm font-extrabold w-4 text-center">
                                  {item.qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateItemQty(ticketId, item.id, item.qty + 1)
                                  }
                                  className="h-7 w-7 flex items-center justify-center rounded-full bg-white border border-warm-200 text-slate-600 hover:border-accent-300"
                                >
                                  <Plus size={13} />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItem(ticketId, item.id)}
                                className="text-rose-500 hover:text-rose-700"
                                aria-label="Remove item"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
          )
        )}
      </div>

      <div className="shrink-0 sticky bottom-16 lg:static border-t border-warm-200 bg-white px-4 py-4 space-y-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div className="flex justify-between text-sm font-semibold text-slate-600">
          <span>Subtotal</span>
          <span>{formatKES(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold text-slate-600">
          <span>VAT (16%)</span>
          <span>{formatKES(vat)}</span>
        </div>
        <div className="flex justify-between text-xl font-black text-slate-900 pt-1">
          <span>Total</span>
          <span>{formatKES(total)}</span>
        </div>
        {holdBlocked && (
          <div className="flex items-start gap-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold px-3 py-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            You already have {MAX_HELD_ORDERS_PER_WAITER} orders on hold. Proceed
            to bill on one of them before holding another.
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            type="button"
            disabled={itemCount === 0}
            onClick={handleSendToKitchen}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
          >
            <ChefHat size={16} /> Send to Kitchen
          </button>
          <button
            type="button"
            disabled={itemCount === 0}
            onClick={handleProceedToBill}
            className="rounded-xl bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
          >
            Proceed to Bill
          </button>
        </div>
      </div>
    </aside>
  );
}
