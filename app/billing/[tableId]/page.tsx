"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { usePosStore, getOrderTotal } from "@/lib/store";
import { BillSummary } from "@/components/billing/BillSummary";
import { SplitPanel, type SplitMode } from "@/components/billing/SplitPanel";
import { PaymentMethodPicker } from "@/components/billing/PaymentMethodPicker";
import { ReceiptModal } from "@/components/billing/ReceiptModal";
import { tableLabel, computeEqualSplit, computeItemSplit } from "@/lib/utils";
import type { PaymentMethod, Receipt, SplitSummary } from "@/lib/types";

export default function BillingPage() {
  const params = useParams<{ tableId: string }>();
  const tableId = params.tableId;
  const router = useRouter();

  const table = usePosStore((s) => s.tables.find((t) => t.id === tableId));
  const order = usePosStore((s) => s.orders[tableId]);
  const confirmPayment = usePosStore((s) => s.confirmPayment);

  const [splitMode, setSplitMode] = useState<SplitMode>("none");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const { subtotal, vat, total } = getOrderTotal(order);
  const itemCount =
    order?.rounds.reduce(
      (sum, r) => sum + r.items.reduce((s2, i) => s2 + i.qty, 0),
      0
    ) ?? 0;

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

  const guestCount = order?.guestCount ?? 1;
  const unassigned =
    splitMode === "item" ? computeItemSplit(order, guestCount).unassigned : 0;
  const blockedBySplit = splitMode === "item" && unassigned > 0;

  function buildSplitSummary(): SplitSummary | undefined {
    if (splitMode === "none") return undefined;
    if (splitMode === "equal") {
      const amounts = computeEqualSplit(total, guestCount);
      return {
        mode: "equal",
        guestCount,
        guestTotals: amounts.map((amount, i) => ({
          guestId: `G${i + 1}`,
          amount,
        })),
      };
    }
    const { guestTotals } = computeItemSplit(order, guestCount);
    return { mode: "item", guestCount, guestTotals };
  }

  async function handlePaymentConfirmed(method: PaymentMethod, ref: string) {
    const r = await confirmPayment(tableId, method, ref, buildSplitSummary());
    setReceipt(r);
  }

  function handleCloseTable() {
    if (!receipt) return;
    usePosStore.getState().closeTable(tableId);
    router.push("/");
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-6 h-16 border-b border-slate-200 bg-white">
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
              <SplitPanel
                tableId={tableId}
                order={order}
                total={total}
                mode={splitMode}
                onModeChange={setSplitMode}
              />
            </div>
            <div>
              {blockedBySplit && (
                <p className="mb-3 text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Assign every item to a guest before taking payment.
                </p>
              )}
              <PaymentMethodPicker
                total={total}
                disabled={itemCount === 0 || blockedBySplit}
                onConfirmed={handlePaymentConfirmed}
              />
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
