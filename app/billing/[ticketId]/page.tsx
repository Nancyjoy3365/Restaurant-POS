"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { usePosStore, unbilledOrderTotal, paymentsForCurrentCycle } from "@/lib/store";
import { BillSummary } from "@/components/billing/BillSummary";
import { BillPreview } from "@/components/billing/BillPreview";
import { PaymentMethodPicker } from "@/components/billing/PaymentMethodPicker";
import { PaymentSuccessModal } from "@/components/billing/PaymentSuccessModal";
import { formatKES } from "@/lib/utils";
import { getDefaultRouteForRole } from "@/lib/roles";
import type { PaymentMethod, Receipt } from "@/lib/types";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  mpesa: "M-Pesa",
  cash: "Cash",
};

export default function BillingPage() {
  const params = useParams<{ ticketId: string }>();
  const ticketId = params.ticketId;
  const router = useRouter();

  const ticket = usePosStore((s) => s.tickets.find((t) => t.id === ticketId));
  const order = usePosStore((s) => s.orders[ticketId]);
  const allPayments = usePosStore((s) => s.payments);
  const staff = usePosStore((s) => s.staff);
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const currentStaff = staff.find((m) => m.id === currentStaffId);
  const startBilling = usePosStore((s) => s.startBilling);
  const recordPayment = usePosStore((s) => s.recordPayment);
  const finalizeReceipt = usePosStore((s) => s.finalizeReceipt);

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  // Guard against re-triggering for the same ticket even if this effect
  // re-runs from an unrelated re-render — startBilling always writes a
  // fresh order object, which would otherwise re-fire this on every store
  // update once `order` is used as a dependency.
  const billingStartedForTicket = useRef<string | null>(null);
  useEffect(() => {
    if (order && !order.billTotals && billingStartedForTicket.current !== ticketId) {
      billingStartedForTicket.current = ticketId;
      startBilling(ticketId);
    }
  }, [order, ticketId, startBilling]);

  const billTotals =
    order?.billTotals ?? (order ? unbilledOrderTotal(order) : { subtotal: 0, vat: 0, total: 0 });
  const { subtotal, vat, total } = billTotals;
  const itemCount =
    order?.rounds.reduce(
      (sum, r) => sum + r.items.reduce((s2, i) => s2 + i.qty, 0),
      0
    ) ?? 0;

  const orderPayments = paymentsForCurrentCycle(allPayments, order);
  const paidSoFar = orderPayments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = Math.max(0, total - paidSoFar);

  if (!ticket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-slate-500 font-bold">Bill not found.</p>
        <button
          onClick={() => router.push("/my-tickets")}
          className="text-accent-600 font-extrabold"
        >
          Back to My Orders
        </button>
      </div>
    );
  }

  const ticketLabel = `Order No. ${ticket.displayNumber}`;

  async function handleRecordPayment(payment: {
    method: PaymentMethod;
    amount: number;
    reference: string;
    customerName?: string;
  }) {
    recordPayment(ticketId, payment);
    const updatedOrder = usePosStore.getState().orders[ticketId];
    if (updatedOrder?.paymentStatus === "paid") {
      setFinalizing(true);
      const r = await finalizeReceipt(ticketId);
      setFinalizing(false);
      setReceipt(r);
    }
  }

  return (
    <div className="flex-1 flex flex-col lg:h-full lg:overflow-hidden">
      <header className="shrink-0 flex items-center gap-3 px-6 h-16 border-b border-warm-200 bg-white">
        <button
          onClick={() => router.push(`/ticket/${ticketId}`)}
          className="rounded-full p-2 hover:bg-slate-100 text-slate-600"
          aria-label="Back to order"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-black text-slate-900">
          Billing · {ticketLabel}
          {ticket.locationNote && ` · ${ticket.locationNote}`}
        </h1>
      </header>

      <main className="flex-1 lg:min-h-0 overflow-y-auto p-6">
        {itemCount === 0 ? (
          <p className="text-slate-400 font-semibold text-center py-16">
            This ticket has no items yet.
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
                subtotal={subtotal}
                vat={vat}
                total={total}
                checkNo={ticket?.displayNumber}
                locationNote={ticket?.locationNote}
                waiterName={staff.find((m) => m.id === ticket?.waiterId)?.name}
              />

              {orderPayments.length > 0 && (
                <div className="rounded-xl border border-warm-200 bg-white p-5">
                  <h2 className="font-extrabold text-slate-900 mb-3">
                    Payments Recorded
                  </h2>
                  <div className="space-y-2 mb-4">
                    {orderPayments.map((p) => {
                      // Only worth surfacing when someone other than the
                      // ticket's own waiter physically took the payment (e.g.
                      // a cashier collecting on their behalf) — display only,
                      // never used for sales credit.
                      const collector =
                        p.collectedByStaffId && p.collectedByStaffId !== p.waiterId
                          ? staff.find((m) => m.id === p.collectedByStaffId)
                          : undefined;
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="font-bold text-slate-700">
                            {METHOD_LABEL[p.method]}
                            {(p.customerName || p.reference) && (
                              <span className="block text-xs text-slate-400 font-semibold">
                                {[p.customerName, p.reference]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            )}
                            {collector && (
                              <span className="block text-xs text-slate-400 font-semibold">
                                Bill collected by {collector.name}
                              </span>
                            )}
                          </span>
                          <span className="font-extrabold text-slate-900">
                            {formatKES(p.amount)}
                          </span>
                        </div>
                      );
                    })}
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
        <PaymentSuccessModal
          label={receipt.ticketLabel}
          total={receipt.total}
          onClose={() => {
            setReceipt(null);
            router.push(getDefaultRouteForRole(currentStaff?.role ?? "Waiter"));
          }}
        />
      )}
    </div>
  );
}
