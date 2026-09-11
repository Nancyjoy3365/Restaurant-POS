import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import type { Payment } from "@/lib/types";

type PaymentRow = {
  PaymentId: number;
  OrderDetailId: number;
  OrderId: number;
  WaiterId: number | null;
  CollectedByStaffId: number | null;
  Method: Payment["method"];
  Amount: number;
  Reference: string;
  CustomerName: string | null;
  IsCashSubstitution: boolean | null;
  BillingCycle: number;
  PaidAt: Date;
};

export function toPayment(row: PaymentRow): Payment {
  return {
    id: String(row.PaymentId),
    orderId: String(row.OrderDetailId),
    ticketId: String(row.OrderId),
    waiterId: row.WaiterId ? String(row.WaiterId) : undefined,
    collectedByStaffId: row.CollectedByStaffId ? String(row.CollectedByStaffId) : undefined,
    method: row.Method,
    amount: row.Amount,
    reference: row.Reference,
    customerName: row.CustomerName ?? undefined,
    isCashSubstitution: row.IsCashSubstitution ?? undefined,
    billingCycle: row.BillingCycle,
    paidAt: row.PaidAt.getTime(),
  };
}

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query<PaymentRow>("SELECT * FROM dbo.Payment ORDER BY PaidAt DESC");
    return NextResponse.json(result.recordset.map(toPayment));
  } catch (err) {
    console.error("GET /api/payments failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load payments", detail: message }, { status: 500 });
  }
}
