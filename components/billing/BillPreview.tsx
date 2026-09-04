"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { usePosStore } from "@/lib/store";
import type { TicketOrder } from "@/lib/types";
import { flattenOrderItems, lineRawTotal, formatKES } from "@/lib/utils";

export function BillPreview({
  order,
  subtotal,
  vat,
  total,
  checkNo,
  waiterName,
}: {
  order: TicketOrder | undefined;
  subtotal: number;
  vat: number;
  total: number;
  checkNo?: number;
  waiterName?: string;
}) {
  const settings = usePosStore((s) => s.restaurantSettings);
  const lines = flattenOrderItems(order);
  const [previewedAt] = useState(() => Date.now());
  const itemCount = lines.reduce((sum, { item }) => sum + item.qty, 0);
  const billDate = new Date(previewedAt).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const billTime = new Date(previewedAt).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <div className="rounded-xl border border-warm-200 bg-white p-5">
      <h2 className="font-extrabold text-slate-900 mb-3">Bill</h2>

      <div
        id="receipt-print"
        className="rounded-xl border border-dashed border-slate-300 p-4 font-mono text-[12px] text-slate-800"
      >
        <div className="text-center mb-2">
          <div className="font-black text-base tracking-wide">
            {settings.name.toUpperCase()}
          </div>
          <div className="text-[10px] text-slate-500">{settings.address}</div>
          <div className="text-[10px] text-slate-500">PIN: {settings.kraPin}</div>
          <div className="text-[10px] text-slate-500">Tel: {settings.phone}</div>
          <div className="text-[10px] font-extrabold mt-0.5">NON FISCAL BILL</div>
        </div>

        <div className="border-t border-dashed border-slate-300 pt-1.5 mb-1.5 text-[10px] space-y-0.5">
          {checkNo !== undefined && (
            <div className="flex justify-between">
              <span>Chk. No.</span>
              <span className="font-bold">{checkNo}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Bill Date</span>
            <span className="font-bold">{billDate}</span>
          </div>
          <div className="flex justify-between">
            <span>Bill Time</span>
            <span className="font-bold">{billTime}</span>
          </div>
          {waiterName && (
            <div className="flex justify-between">
              <span>Served By</span>
              <span className="font-bold">{waiterName}</span>
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-slate-300 pt-1.5">
          {/* Percentage widths (not fixed px) so the columns reflow to
              whatever the physical paper actually is — a 58mm/80mm thermal
              roll or a full page — instead of assuming one fixed width. */}
          <div className="flex justify-between text-[9px] font-extrabold uppercase tracking-wide text-slate-500 pb-0.5">
            <span className="w-[12%]">Qty</span>
            <span className="w-[46%]">Item Name</span>
            <span className="w-[21%] text-right">Price</span>
            <span className="w-[21%] text-right">Total</span>
          </div>
          <div className="space-y-0.5">
            {lines.map(({ item }) => (
              <div key={item.id} className="flex justify-between">
                <span className="w-[12%]">{item.qty.toFixed(1)}</span>
                <span className="w-[46%] truncate pr-1">{item.name}</span>
                <span className="w-[21%] text-right">{item.price}</span>
                <span className="w-[21%] text-right">{lineRawTotal(item)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-dashed border-slate-300 mt-1.5 pt-1.5 space-y-0.5">
          <div className="flex justify-between text-[10px]">
            <span>Bill Item(s):</span>
            <span className="font-bold">{itemCount.toFixed(1)}</span>
          </div>
          <div className="flex justify-between font-black text-sm">
            <span>BILL TOTAL</span>
            <span>{formatKES(total)}</span>
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>VAT ({Math.round(settings.vatRate * 100)}%, inclusive)</span>
            <span>{formatKES(vat)}</span>
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Subtotal (excl. VAT)</span>
            <span>{formatKES(subtotal)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-300 mt-1.5 pt-1.5 text-center text-[9px] text-slate-500 leading-tight">
          Not a tax invoice — get your official ETR receipt from the cashier
          after paying.
        </div>

        <div className="border-t border-dashed border-slate-300 mt-1.5 pt-1.5 text-center">
          <div className="text-[10px] font-bold">LIPA NA MPESA</div>
          <div className="text-[10px] font-bold">BUY GOODS</div>
          <div className="text-xl font-black tracking-wider mt-0.5">
            {settings.tillNumber}
          </div>
        </div>
      </div>

      {/* Thermal receipt printers are almost always 58mm or 80mm rolls —
          this is the setting-driven part of the print page size (see
          Settings); the fixed margin lives in globals.css. */}
      <style>{`@media print { @page { size: ${settings.receiptWidth} auto; } }`}</style>

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
