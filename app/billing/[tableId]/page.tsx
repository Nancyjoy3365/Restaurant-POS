"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { usePosStore, getOrderTotal } from "@/lib/store";
import { BillSummary } from "@/components/billing/BillSummary";
import { BillPreview } from "@/components/billing/BillPreview";
import { PaymentMethodPicker } from "@/components/billing/PaymentMethodPicker";
import { ReceiptModal } from "@/components/billing/ReceiptModal";
import { tableLabel, formatKES } from "@/lib/utils";
import type { PaymentMethod, Receipt } from "@/lib/types";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  mpesa: "M-Pesa",
  card: "Card",
  cash: "Cash",
};

export default function BillingPage() {
  const params = useParams<{ tableId: string }>();
  const tableId = params.tableId;
  const router = useRouter();

  const table = usePosStore((s) => s.tables.find((t) => t.id === tableId));
  const order = usePosStore((s) => s.orders[tableId]);
  const allPayments = usePosStore((s) => s.payments);
  const startBilling = usePosStore((s) => s.startBilling);
  const recordPayment = usePosStore((s) => s.recordPayment);
  const finalizeReceipt = usePosStore((s) => s.finalizeReceipt);

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    if (order && !order.billTotals) {
      startBilling(tableId);
    }
  }, [order, tableId, startBilling]);

  const billTotals = order?.billTotals ?? getOrderTotal(order);
  const { subtotal, vat, total } = billTotals;
  const itemCount =
    order?.rounds.reduce(
      (sum, r) => sum + r.items.reduce((s2, i) => s2 + i.qty, 0),
      0
    ) ?? 0;

  const orderPayments = order
    ? allPayments.filter((p) => p.orderId === order.id)
    : [];
  const paidSoFar = orderPayments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = Math.max(0, total - paidSoFar);
  const paymentStatus = order?.paymentStatus ?? "unpaid";

  if (!table) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-slate-500 font-bold">Table not found.</p>
        <button
          onClick={() => router.push("/")}
          className="text-accent-600 font-extrabold"
        >
          Back to Floor View
        </button>
      </div>
    );
  }

  async function handleRecordPayment(payment: {
    method: PaymentMethod;
    amount: number;
    reference: string;
  }) {
    recordPayment(tableId, payment);
    const updatedOrder = usePosStore.getState().orders[tableId];
    if (updatedOrder?.paymentStatus === "paid") {
      setFinalizing(true);
      const r = await finalizeReceipt(tableId);
      setFinalizing(false);
      setReceipt(r);
    }
  }

  function handleCloseTable() {
    if (!receipt) return;
    usePosStore.getState().closeTable(tableId);
    router.push("/");
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-6 h-16 border-b border-warm-200 bg-white">
        <button
          onClick={() => router.push(`/order/${tableId}`)}
          className="rounded-full p-2 hover:bg-slate-100 text-slate-600"
          aria-label="Back to order"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-black text-slate-900">
          Billing · {tableLabel(table)}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {itemCount === 0 ? (
          <p className="text-slate-400 font-semibold text-center py-16">
            This table has no items yet.
          </p>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6 max-w-5xl">
            <div className="space-y-6">
              <BillSummary
                order={order}
                subtotal={subtotal}
                vat={vat}
                total={total}
              />
            </div>
            <div className="space-y-6">
              <BillPreview
                order={order}
                tableLabel={tableLabel(table)}
                subtotal={subtotal}
                vat={vat}
                total={total}
                paymentStatus={paymentStatus}
                balanceDue={balanceDue}
              />

              {orderPayments.length > 0 && (
                <div className="rounded-xl border border-warm-200 bg-white p-5">
                  <h2 className="font-extrabold text-slate-900 mb-3">
                    Payments Recorded
                  </h2>
                  <div className="space-y-2 mb-4">
                    {orderPayments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="font-bold text-slate-700">
                          {METHOD_LABEL[p.method]}
                        </span>
                        <span className="font-extrabold text-slate-900">
                          {formatKES(p.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-slate-600 border-t border-warm-200 pt-2">
                    <span>Paid so far</span>
                    <span>{formatKES(paidSoFar)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-slate-900">
                    <span>Balance due</span>
                    <span>{formatKES(balanceDue)}</span>
                  </div>
                </div>
              )}

              {balanceDue === 0 ? (
                <div className="rounded-xl border border-status-free bg-white p-5 flex items-center gap-2 text-status-free font-extrabold">
                  <CheckCircle2 size={20} />
                  {finalizing ? "Finalizing receipt…" : "Fully paid"}
                </div>
              ) : (
                <PaymentMethodPicker
                  balanceDue={balanceDue}
                  onRecorded={handleRecordPayment}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {receipt && (
        <ReceiptModal
          receipt={receipt}
          onClose={() => setReceipt(null)}
          onCloseTable={handleCloseTable}
        />
      )}
    </div>
  );
}
