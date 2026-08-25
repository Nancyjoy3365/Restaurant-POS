"use client";

import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, Layers, PauseCircle } from "lucide-react";
import { usePosStore, getOrderTotal } from "@/lib/store";
import { formatKES } from "@/lib/utils";
import { FoodImage } from "@/components/shared/FoodImage";

export function CartPanel({ tableId }: { tableId: string }) {
  const router = useRouter();
  const order = usePosStore((s) => s.orders[tableId]);
  const menu = usePosStore((s) => s.menu);
  const updateItemQty = usePosStore((s) => s.updateItemQty);
  const removeItem = usePosStore((s) => s.removeItem);
  const addRound = usePosStore((s) => s.addRound);
  const startBilling = usePosStore((s) => s.startBilling);

  const itemCount =
    order?.rounds.reduce(
      (sum, r) => sum + r.items.reduce((s2, i) => s2 + i.qty, 0),
      0
    ) ?? 0;

  const { subtotal, vat, total } = getOrderTotal(order);

  function handleProceedToBill() {
    startBilling(tableId);
    router.push(`/billing/${tableId}`);
  }

  function handleHoldOrder() {
    // Order is already persisted per-table in the store; holding just
    // parks the table (stays "occupied") so the waiter can serve others
    // and come back to add more rounds or bill later.
    router.push("/");
  }

  return (
    <aside className="flex flex-col w-full lg:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-warm-200 bg-white lg:h-full">
      <div className="flex items-center justify-between px-4 py-4 border-b border-warm-200">
        <h2 className="font-extrabold text-lg text-slate-900">
          Order ({itemCount} item{itemCount === 1 ? "" : "s"})
        </h2>
        <button
          type="button"
          onClick={() => addRound(tableId)}
          className="flex items-center gap-1.5 rounded-full border-2 border-accent-300 text-accent-700 hover:bg-accent-50 text-xs font-extrabold px-3.5 py-2"
        >
          <Layers size={14} /> New Round
        </button>
      </div>

      <div className="max-h-[45vh] lg:max-h-none lg:flex-1 overflow-y-auto px-4 py-3 space-y-4">
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
                                    updateItemQty(tableId, item.id, item.qty - 1)
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
                                    updateItemQty(tableId, item.id, item.qty + 1)
                                  }
                                  className="h-7 w-7 flex items-center justify-center rounded-full bg-white border border-warm-200 text-slate-600 hover:border-accent-300"
                                >
                                  <Plus size={13} />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItem(tableId, item.id)}
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

      <div className="border-t border-warm-200 px-4 py-4 space-y-1.5">
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
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            disabled={itemCount === 0}
            onClick={handleHoldOrder}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border-2 border-accent-300 text-accent-700 hover:bg-accent-50 disabled:border-warm-200 disabled:text-slate-300 font-extrabold py-3 transition-colors"
          >
            <PauseCircle size={17} /> Hold Order
          </button>
          <button
            type="button"
            disabled={itemCount === 0}
            onClick={handleProceedToBill}
            className="flex-1 rounded-xl bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
          >
            Proceed to Bill
          </button>
        </div>
      </div>
    </aside>
  );
}
