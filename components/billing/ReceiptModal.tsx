"use client";

import Image from "next/image";
import { Printer, DoorOpen, CheckCircle2 } from "lucide-react";
import type { Receipt } from "@/lib/types";
import { formatKES, formatDateTime } from "@/lib/utils";

const METHOD_LABEL: Record<Receipt["paymentMethod"], string> = {
  mpesa: "M-Pesa",
  card: "Card",
  cash: "Cash",
};

export function ReceiptModal({
  receipt,
  onClose,
  onCloseTable,
}: {
  receipt: Receipt;
  onClose: () => void;
  onCloseTable: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center gap-2 px-6 pt-6 text-emerald-600">
          <CheckCircle2 size={22} />
          <h2 className="font-black text-lg text-slate-900">Payment Successful</h2>
        </div>

        <div
          id="receipt-print"
          className="mx-6 mt-4 mb-2 rounded-xl border border-dashed border-slate-300 p-5 overflow-y-auto font-mono text-[13px] text-slate-800"
        >
          <div className="text-center mb-3">
            <div className="font-black text-base tracking-wide">BARAKA GRILL</div>
            <div className="text-[11px] text-slate-500">Nairobi, Kenya · PIN: P000000000A</div>
            <div className="text-[11px] text-slate-500">{formatDateTime(receipt.issuedAt)}</div>
          </div>
          <div className="border-t border-b border-dashed border-slate-300 py-2 mb-2 flex justify-between text-[11px] font-bold">
            <span>{receipt.tableLabel}</span>
            <span>Inv #{receipt.invoiceNumber}</span>
          </div>
          <div className="space-y-1 mb-2">
            {receipt.items.map((line, i) => (
              <div key={i} className="flex justify-between">
                <span className="truncate pr-2">
                  {line.qty}× {line.name}
                </span>
                <span className="whitespace-nowrap">{formatKES(line.lineTotal)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-slate-300 pt-2 space-y-0.5">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatKES(receipt.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT (16%)</span>
              <span>{formatKES(receipt.vat)}</span>
            </div>
            <div className="flex justify-between font-black text-sm border-t border-slate-300 mt-1 pt-1">
              <span>TOTAL</span>
              <span>{formatKES(receipt.total)}</span>
            </div>
          </div>
          <div className="border-t border-dashed border-slate-300 mt-2 pt-2 text-[11px]">
            <div className="flex justify-between">
              <span>Paid via</span>
              <span>{METHOD_LABEL[receipt.paymentMethod]}</span>
            </div>
            <div className="flex justify-between">
              <span>Reference</span>
              <span>{receipt.paymentRef}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-col items-center gap-1">
            <Image
              src={receipt.qrDataUrl}
              alt="eTIMS verification QR"
              width={96}
              height={96}
              unoptimized
            />
            <div className="text-[10px] text-slate-500 text-center">
              KRA eTIMS Invoice: {receipt.invoiceNumber}
              <br />
              Fiscally signed · scan to verify
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-6 py-5">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-accent-600 text-accent-700 font-extrabold py-2.5 hover:bg-accent-50"
          >
            <Printer size={16} /> Print
          </button>
          <button
            type="button"
            onClick={onCloseTable}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 text-white font-extrabold py-2.5"
          >
            <DoorOpen size={16} /> Close Table
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 font-bold pb-4 hover:text-slate-600"
        >
          Keep table open, close this receipt
        </button>
      </div>
    </div>
  );
}
