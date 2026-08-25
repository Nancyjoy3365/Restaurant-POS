"use client";

import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, Layers } from "lucide-react";
import { usePosStore, getOrderTotal } from "@/lib/store";
import { formatKES } from "@/lib/utils";

export function CartPanel({ tableId }: { tableId: string }) {
  const router = useRouter();
  const order = usePosStore((s) => s.orders[tableId]);
  const updateItemQty = usePosStore((s) => s.updateItemQty);
  const removeItem = usePosStore((s) => s.removeItem);
  const addRound = usePosStore((s) => s.addRound);
  const setTableStatus = usePosStore((s) => s.setTableStatus);

  const itemCount =
    order?.rounds.reduce(
      (sum, r) => sum + r.items.reduce((s2, i) => s2 + i.qty, 0),
      0
    ) ?? 0;

  const { subtotal, vat, total } = getOrderTotal(order);

  function handleProceedToBill() {
    setTableStatus(tableId, "needs-bill");
    router.push(`/billing/${tableId}`);
  }

  return (
    <aside className="flex flex-col w-full lg:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white lg:h-full">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200">
        <h2 className="font-extrabold text-slate-900">
          Order ({itemCount} item{itemCount === 1 ? "" : "s"})
        </h2>
        <button
          type="button"
          onClick={() => addRound(tableId)}
          className="flex items-center gap-1 rounded-full border border-accent-300 text-accent-700 hover:bg-accent-50 text-xs font-extrabold px-3 py-1.5"
        >
          <Layers size={13} /> New Round
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
                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 truncate">
                                {item.name}
                              </div>
                              {(item.spiceLevel || item.addOns.length > 0) && (
                                <div className="text-[11px] text-slate-500 font-semibold">
                                  {[
                                    item.spiceLevel,
                                    ...item.addOns.map((a) => a.name),
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-extrabold text-slate-900 whitespace-nowrap">
                              {formatKES(lineTotal)}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateItemQty(tableId, item.id, item.qty - 1)
                                }
                                className="h-6 w-6 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:border-accent-300"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="text-sm font-extrabold w-4 text-center">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateItemQty(tableId, item.id, item.qty + 1)
                                }
                                className="h-6 w-6 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:border-accent-300"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(tableId, item.id)}
                              className="text-rose-500 hover:text-rose-700"
                              aria-label="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
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

      <div className="border-t border-slate-200 px-4 py-3.5 space-y-1.5">
        <div className="flex justify-between text-sm font-semibold text-slate-600">
          <span>Subtotal</span>
          <span>{formatKES(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold text-slate-600">
          <span>VAT (16%)</span>
          <span>{formatKES(vat)}</span>
        </div>
        <div className="flex justify-between text-base font-black text-slate-900 pt-1">
          <span>Total</span>
          <span>{formatKES(total)}</span>
        </div>
        <button
          type="button"
          disabled={itemCount === 0}
          onClick={handleProceedToBill}
          className="w-full mt-2 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-2.5 transition-colors"
        >
          Proceed to Bill
        </button>
      </div>
    </aside>
  );
}
