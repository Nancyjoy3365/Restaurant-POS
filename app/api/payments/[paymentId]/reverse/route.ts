import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { fetchTicketAndOrder } from "@/lib/server/orders";

export async function POST(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  try {
    const pool = await getPool();
    const orderResult = await pool
      .request()
      .input("PaymentId", sql.Int, Number(paymentId))
      .query<{ OrderId: number }>("SELECT OrderId FROM dbo.Payment WHERE PaymentId = @PaymentId");
    const orderId = orderResult.recordset[0]?.OrderId;
    if (!orderId) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    await pool.request().input("PaymentId", sql.Int, Number(paymentId)).execute("usp_ReverseCompletedPayment");

    const updated = await fetchTicketAndOrder(pool, orderId);
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`POST /api/payments/${paymentId}/reverse failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to reverse payment", detail: message }, { status: 500 });
  }
}
