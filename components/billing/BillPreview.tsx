"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import type { TicketOrder } from "@/lib/types";
import { flattenOrderItems, lineRawTotal, formatKES, formatDateTime } from "@/lib/utils";

export function BillPreview({
  order,
  total,
}: {
  order: TicketOrder | undefined;
  total: number;
}) {
  const lines = flattenOrderItems(order);
  const [previewedAt] = useState(() => Date.now());

  return (
    <div className="rounded-xl border border-warm-200 bg-white p-5">
      <h2 className="font-extrabold text-slate-900 mb-3">Bill</h2>

      <div
        id="receipt-print"
        className="rounded-xl border border-dashed border-slate-300 p-5 font-mono text-[13px] text-slate-800"
      >
        <div className="text-center mb-3">
          <div className="font-black text-base tracking-wide">
            SAMAKI MJINI RESTAURANT
          </div>
          <div className="text-[11px] text-slate-500">
            Utawala - Next to Quickmart Kwa Chief
          </div>
          <div className="text-[11px] text-slate-500">
            PIN: P000000000A
          </div>
          <div className="text-[11px] text-slate-500">Tel: 0719 877 022</div>
          <div className="text-[11px] text-slate-500">
            {formatDateTime(previewedAt)}
          </div>
        </div>
        <div className="border-t border-dashed border-slate-300 pt-2 mb-2 space-y-0.5">
          <div className="flex justify-between font-black text-sm">
            <span>TOTAL</span>
            <span>{formatKES(total)}</span>
          </div>
        </div>
        <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
          {lines.map(({ item }) => (
            <div key={item.id} className="flex justify-between">
              <span className="truncate pr-2">
                {item.qty}× {item.name}
              </span>
              <span className="whitespace-nowrap">
                {formatKES(lineRawTotal(item))}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-slate-300 mt-2 pt-2 text-center text-[11px] font-bold">
          Till Number: 4983794
        </div>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="w-full mt-4 flex items-center justify-center gap-2 rounded-lg border-2 border-accent-600 text-accent-700 font-extrabold py-3 hover:bg-accent-50"
      >
        <Printer size={16} /> Print Bill
      </button>
    </div>
  );
}
