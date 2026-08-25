import type { TableOrder } from "@/lib/types";
import { flattenOrderItems, lineRawTotal, formatKES } from "@/lib/utils";

export function BillSummary({
  order,
  subtotal,
  vat,
  total,
}: {
  order: TableOrder | undefined;
  subtotal: number;
  vat: number;
  total: number;
}) {
  const lines = flattenOrderItems(order);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-extrabold text-slate-900 mb-3">
        Consolidated Bill{" "}
        <span className="text-slate-400 font-semibold text-sm">
          (all rounds)
        </span>
      </h2>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {lines.length === 0 ? (
          <p className="text-sm text-slate-400 font-semibold">No items.</p>
        ) : (
          lines.map(({ item, roundIndex }) => (
            <div
              key={item.id}
              className="flex items-start justify-between text-sm"
            >
              <div className="min-w-0">
                <div className="font-bold text-slate-800 truncate">
                  {item.qty}× {item.name}
                </div>
                <div className="text-[11px] text-slate-400 font-semibold">
                  Round {roundIndex}
                  {item.spiceLevel ? ` · ${item.spiceLevel}` : ""}
                  {item.addOns.length > 0
                    ? ` · ${item.addOns.map((a) => a.name).join(", ")}`
                    : ""}
                </div>
              </div>
              <span className="font-bold text-slate-800 whitespace-nowrap">
                {formatKES(lineRawTotal(item))}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-slate-200 mt-3 pt-3 space-y-1.5">
        <div className="flex justify-between text-sm font-semibold text-slate-600">
          <span>Subtotal</span>
          <span>{formatKES(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold text-slate-600">
          <span>VAT (16%)</span>
          <span>{formatKES(vat)}</span>
        </div>
        <div className="flex justify-between text-lg font-black text-slate-900 pt-1">
          <span>Total</span>
          <span>{formatKES(total)}</span>
        </div>
      </div>
    </div>
  );
}
