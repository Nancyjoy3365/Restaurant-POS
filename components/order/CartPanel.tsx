"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Minus, Plus, PauseCircle, AlertCircle, StickyNote, X } from "lucide-react";
import { usePosStore } from "@/lib/store";
import {
  useOrder,
  useOpenOrders,
  updateItemQty as updateItemQtyMutation,
  updateItemNote as updateItemNoteMutation,
  sendRoundToKitchen as sendRoundToKitchenMutation,
} from "@/lib/hooks/useOrders";
import { startBilling as startBillingMutation } from "@/lib/api/billing";
import { useRestaurantSettings } from "@/lib/hooks/useBilling";
import { getOrderTotal, formatKES } from "@/lib/utils";
import type { MenuMode } from "@/lib/menuGrouping";

const MAX_HELD_ORDERS_PER_WAITER = 5;

export function CartPanel({
  ticketId,
  mode,
  onModeChange,
}: {
  ticketId: string;
  mode: MenuMode;
  onModeChange: (m: MenuMode) => void;
}) {
  const router = useRouter();
  const { order } = useOrder(ticketId);
  const { orders } = useOpenOrders();
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const { vatRate } = useRestaurantSettings();
  const [holdBlocked, setHoldBlocked] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteItemId, setNoteItemId] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  const itemCount =
    order?.rounds.reduce((sum, r) => sum + r.items.reduce((s2, i) => s2 + i.qty, 0), 0) ?? 0;
  const { subtotal, vat, total } = getOrderTotal(order, vatRate);
  const isHeld = order?.onHold ?? false;
  const roundsWithItems = order?.rounds.filter((r) => r.items.length > 0) ?? [];
  const allItems = roundsWithItems.flatMap((r) => r.items);

  async function handleProceedToBill() {
    await startBillingMutation(ticketId);
    router.push(`/billing/${ticketId}`);
  }

  function heldOrderCountForWaiter(waiterId: string | null): number {
    if (!waiterId) return 0;
    return Object.values(orders).filter((o) => o.onHold && o.waiterId === waiterId).length;
  }

  async function handleSendToKitchen() {
    if (!order) return;
    const latestRoundId = order.rounds[order.rounds.length - 1]?.id;
    if (!latestRoundId) return;
    if (!isHeld && heldOrderCountForWaiter(currentStaffId) >= MAX_HELD_ORDERS_PER_WAITER) {
      setHoldBlocked(true);
      return;
    }
    // Sending to kitchen automatically puts the order on hold — being
    // processed — and starts a fresh round on this same ticket, ready for
    // the next course.
    setHoldBlocked(false);
    await sendRoundToKitchenMutation(latestRoundId);
  }

  function openNoteEditor(itemId?: string) {
    const id = itemId ?? allItems[allItems.length - 1]?.id ?? "";
    setNoteItemId(id);
    setNoteDraft(allItems.find((i) => i.id === id)?.note ?? "");
    setNoteOpen(true);
  }

  function saveNote() {
    if (noteItemId) updateItemNoteMutation(noteItemId, noteDraft);
    setNoteOpen(false);
  }

  return (
    <aside className="hidden lg:flex flex-col w-80 xl:w-96 shrink-0 border-l border-warm-200 bg-white h-full">
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-warm-200 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-extrabold text-slate-900">
            Current order · {itemCount} item{itemCount === 1 ? "" : "s"}
          </h2>
          {isHeld && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-extrabold px-2 py-0.5">
              <PauseCircle size={12} /> On hold
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 rounded-lg bg-warm-100 p-0.5">
          {(
            [
              { id: "dine_in", label: "Dine-in" },
              { id: "takeaway", label: "Takeaway" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onModeChange(m.id)}
              className={clsx(
                "rounded-md py-1.5 text-xs font-bold transition-colors",
                mode === m.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2">
        {itemCount === 0 ? (
          <p className="text-sm text-slate-400 font-semibold text-center py-10">
            No items yet — tap a dish to add it.
          </p>
        ) : (
          <>
            {roundsWithItems.map((round) => (
              <div key={round.id}>
                {roundsWithItems.length > 1 && (
                  <div className="pt-3 pb-1 text-[11px] font-extrabold text-slate-400">
                    Round {round.index}
                  </div>
                )}
                <div className="divide-y divide-warm-100">
                  {round.items.map((item) => {
                    const addOnTotal = item.addOns.reduce((s, a) => s + a.price, 0);
                    const details = [item.spiceLevel, ...item.addOns.map((a) => a.name)]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <div key={item.id} className="flex items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-slate-900 truncate">{item.name}</div>
                          <div className="text-xs font-semibold text-slate-500 truncate">
                            {formatKES(item.price + addOnTotal)}
                            {details && ` · ${details}`}
                          </div>
                          {item.note && (
                            <button
                              type="button"
                              onClick={() => openNoteEditor(item.id)}
                              className="mt-0.5 flex max-w-full items-center gap-1 text-left text-xs font-semibold italic text-amber-700"
                            >
                              <StickyNote size={11} className="shrink-0" />
                              <span className="truncate">{item.note}</span>
                            </button>
                          )}
                        </div>
                        <div className="inline-flex shrink-0 items-center rounded-full border border-warm-200">
                          <button
                            type="button"
                            onClick={() => updateItemQtyMutation(ticketId, item.id, item.qty - 1, vatRate)}
                            aria-label={item.qty === 1 ? `Remove ${item.name}` : `Remove one ${item.name}`}
                            className="h-7 w-7 flex items-center justify-center text-slate-600 hover:text-accent-700"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-5 text-center text-sm font-extrabold">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateItemQtyMutation(ticketId, item.id, item.qty + 1, vatRate)}
                            aria-label={`Add one ${item.name}`}
                            className="h-7 w-7 flex items-center justify-center text-slate-600 hover:text-accent-700"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => openNoteEditor()}
              className="mt-1 py-2 text-xs font-bold text-accent-700 hover:text-accent-800"
            >
              + Add note for kitchen
            </button>
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-warm-200 bg-white px-4 py-4 space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-slate-500">
          <span>Subtotal</span>
          <span>{formatKES(subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs font-semibold text-slate-500">
          <span>VAT ({Math.round(vatRate * 100)}%)</span>
          <span>{formatKES(vat)}</span>
        </div>
        <div className="flex justify-between text-lg font-black text-slate-900 pt-1">
          <span>Total</span>
          <span>{formatKES(total)}</span>
        </div>
        {holdBlocked && (
          <div className="flex items-start gap-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold px-3 py-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            You already have {MAX_HELD_ORDERS_PER_WAITER} orders on hold. Proceed to bill on one of
            them before holding another.
          </div>
        )}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            disabled={itemCount === 0}
            onClick={handleSendToKitchen}
            className="w-full rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white text-sm font-extrabold py-3 transition-colors"
          >
            Send to kitchen
          </button>
          <button
            type="button"
            disabled={itemCount === 0}
            onClick={handleProceedToBill}
            className="w-full rounded-lg border border-warm-200 bg-white hover:bg-warm-50 disabled:text-slate-300 text-slate-800 text-sm font-bold py-2.5 transition-colors"
          >
            Proceed to bill
          </button>
        </div>
      </div>

      {noteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setNoteOpen(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-slate-900">Note for kitchen</h3>
              <button
                type="button"
                onClick={() => setNoteOpen(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <label className="text-xs font-bold text-slate-500">Dish</label>
            <select
              value={noteItemId}
              onChange={(e) => {
                setNoteItemId(e.target.value);
                setNoteDraft(allItems.find((i) => i.id === e.target.value)?.note ?? "");
              }}
              className="mt-1 mb-3 w-full rounded-lg border border-warm-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-accent-400"
            >
              {allItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                  {i.spiceLevel ? ` (${i.spiceLevel})` : ""}
                </option>
              ))}
            </select>
            <label className="text-xs font-bold text-slate-500">Note</label>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="e.g. No onions, extra spicy…"
              rows={3}
              autoFocus
              className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent-400 resize-none"
            />
            <button
              type="button"
              onClick={saveNote}
              disabled={!noteItemId}
              className="w-full mt-3 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white text-sm font-extrabold py-3"
            >
              Save note
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
