"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { useRestaurantSettings } from "@/lib/hooks/useBilling";
import type { TicketOrder } from "@/lib/types";
import { flattenOrderItems, lineRawTotal, formatKES } from "@/lib/utils";

export function BillPreview({
  order,
  total,
  checkNo,
  waiterName,
}: {
  order: TicketOrder | undefined;
  total: number;
  checkNo?: number;
  waiterName?: string;
}) {
  const { settings } = useRestaurantSettings();
  const lines = flattenOrderItems(order);
  // Settings is briefly undefined until the first fetch resolves (unlike
  // the old store's always-present seeded default).
  const restaurant = settings ?? {
    name: "",
    address: "",
    kraPin: "",
    phone: "",
    tillNumber: "",
    receiptWidth: "80mm" as const,
  };
  const [previewedAt] = useState(() => Date.now());
  const receiptRef = useRef<HTMLDivElement>(null);
  const pageStyleRef = useRef<HTMLStyleElement>(null);
  // "auto" in the @page rule below is honored inconsistently — reliably for
  // "Save as PDF" in Chrome, but many thermal-printer drivers fall back to
  // whatever fixed roll length they default to instead, which is exactly
  // the leftover blank paper this works around. `beforeprint` fires
  // synchronously right as the browser switches the DOM to print-media
  // styles (the tightened padding/font-size in globals.css) and right
  // before it paginates — measuring and writing the style tag directly
  // here (not via setState, whose re-render could commit too late for
  // this same print pass) captures the real printed height and hands the
  // driver a concrete page length to honor instead of "auto".
  useEffect(() => {
    function measure() {
      const el = receiptRef.current;
      const styleEl = pageStyleRef.current;
      if (!el || !styleEl) return;
      const contentMm = (el.offsetHeight / 96) * 25.4;
      // +4mm covers the top/bottom @page margin (globals.css) that sits
      // outside this element's own box but still needs to fit on the page.
      const pageHeightMm = Math.ceil(contentMm) + 4;
      styleEl.textContent = `@media print { @page { size: ${restaurant.receiptWidth} ${pageHeightMm}mm; } }`;
    }
    window.addEventListener("beforeprint", measure);
    return () => window.removeEventListener("beforeprint", measure);
  }, [restaurant.receiptWidth]);
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
        ref={receiptRef}
        className="rounded-xl border border-dashed border-slate-300 p-4 font-sans text-[12px] text-slate-800"
      >
        <div className="text-center">
          <div className="font-black text-base tracking-wide">
            {restaurant.name.toUpperCase()}
          </div>
          <div className="text-[10px] text-slate-500">{restaurant.address}</div>
          <div className="text-[10px] text-slate-500">PIN: {restaurant.kraPin}</div>
          <div className="text-[10px] text-slate-500">Tel: {restaurant.phone}</div>
          <div className="text-[10px] font-extrabold mt-0.5">NON FISCAL BILL</div>
        </div>

        <div className="mt-1.5 border-t border-dashed border-slate-300 pt-1.5 mb-1.5 text-[10px] space-y-0.5">
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

        <div className="border-t border-dashed border-slate-300 pt-1.5 pr-1">
          {/* Percentage widths (not fixed px) so the columns reflow to
              whatever the physical paper actually is — a 58mm/80mm thermal
              roll or a full page — instead of assuming one fixed width.
              These deliberately add up to less than 100% (94%, not 100%)
              so the rightmost Amt figure always keeps a little breathing
              room before the page's own right margin, rather than sitting
              flush against it — the outer pr-1 above adds a further fixed
              cushion on top of that. */}
          <div className="flex justify-between text-[9px] font-extrabold uppercase tracking-wide text-slate-500 pb-0.5">
            <span className="w-[40%]">Item</span>
            <span className="w-[10%] text-right">Qty</span>
            <span className="w-[22%] text-right">Price</span>
            <span className="w-[22%] text-right">Amt</span>
          </div>
          <div className="space-y-0.5">
            {lines.map(({ item }) => (
              <div key={item.id} className="flex justify-between items-start">
                <span className="w-[40%] pr-1 break-words">{item.name}</span>
                <span className="w-[10%] text-right">{item.qty.toFixed(1)}</span>
                <span className="w-[22%] text-right">{item.price}</span>
                <span className="w-[22%] text-right">{lineRawTotal(item)}</span>
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
          <div className="text-center text-[10px] text-slate-500">
            Prices inclusive of VAT where applicable
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
            {restaurant.tillNumber}
          </div>
        </div>

        <div className="border-t border-dashed border-slate-300 mt-1.5 pt-1.5 text-center text-[10px] font-bold italic">
          Get it fresh, get it tasty.
        </div>
      </div>

      {/* Thermal receipt printers are almost always 58mm or 80mm rolls —
          this is the setting-driven part of the print page size (see
          Settings); the fixed margin lives in globals.css. The effect
          above overwrites this with the real measured content height on
          every print pass — this starting content is only ever seen if
          that measurement somehow doesn't run. */}
      <style ref={pageStyleRef}>{`@media print { @page { size: ${restaurant.receiptWidth} auto; } }`}</style>

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
