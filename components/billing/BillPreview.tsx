"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import type { OrderPaymentStatus, TableOrder } from "@/lib/types";
import { flattenOrderItems, lineRawTotal, formatKES, formatDateTime } from "@/lib/utils";

export function BillPreview({
  order,
  tableLabel,
  subtotal,
  vat,
  total,
  paymentStatus,
  balanceDue,
}: {
  order: TableOrder | undefined;
  tableLabel: string;
  subtotal: number;
  vat: number;
  total: number;
  paymentStatus: OrderPaymentStatus;
  balanceDue: number;
}) {
  const lines = flattenOrderItems(order);
  const [previewedAt] = useState(() => Date.now());

  const statusLabel =
    paymentStatus === "paid"
      ? "Paid in Full"
      : paymentStatus === "partially_paid"
      ? `Partially Paid — ${formatKES(balanceDue)} remaining`
      : "Not Yet Paid";

  return (
    <div className="rounded-xl border border-warm-200 bg-white p-5">
      <h2 className="font-extrabold text-slate-900 mb-3">Bill Preview</h2>
      <p className="text-xs text-slate-500 font-semibold mb-4">
        Print this for the customer to review before collecting payment
        below.
      </p>

      <div
        id="receipt-print"
        className="rounded-xl border border-dashed border-slate-300 p-5 font-mono text-[13px] text-slate-800"
      >
        <div className="text-center mb-3">
          <div className="font-black text-base tracking-wide">BARAKA GRILL</div>
          <div className="text-[11px] text-slate-500">
            Nairobi, Kenya · PIN: P000000000A
          </div>
          <div className="text-[11px] text-slate-500">
            {formatDateTime(previewedAt)}
          </div>
        </div>
        <div className="border-t border-b border-dashed border-slate-300 py-2 mb-2 text-[11px] font-bold text-center">
          {tableLabel} — {statusLabel}
        </div>
        <div className="space-y-1 mb-2">
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
        <div className="border-t border-dashed border-slate-300 pt-2 space-y-0.5">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatKES(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT (16%)</span>
            <span>{formatKES(vat)}</span>
          </div>
          <div className="flex justify-between font-black text-sm border-t border-slate-300 mt-1 pt-1">
            <span>TOTAL</span>
            <span>{formatKES(total)}</span>
          </div>
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
