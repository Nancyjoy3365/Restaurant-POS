import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { fetchTicketAndOrder } from "@/lib/server/orders";

export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const body = await request.json();
  const { method, amount, reference, customerName, isCashSubstitution, collectedByStaffId } = body;

  if (!method || !amount) {
    return NextResponse.json({ error: "method and amount are required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    const orderDetailResult = await pool
      .request()
      .input("OrderId", sql.Int, Number(ticketId))
      .query<{ OrderDetailId: number }>("SELECT OrderDetailId FROM dbo.OrderDetail WHERE OrderId = @OrderId");
    const orderDetailId = orderDetailResult.recordset[0]?.OrderDetailId;
    if (!orderDetailId) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    await pool
      .request()
      .input("OrderDetailId", sql.Int, orderDetailId)
      .input("OrderId", sql.Int, Number(ticketId))
      .input("Method", sql.NVarChar(10), method)
      .input("Amount", sql.Decimal(12, 2), amount)
      .input("Reference", sql.NVarChar(100), reference ?? "")
      .input("CustomerName", sql.NVarChar(150), customerName ?? null)
      .input("IsCashSubstitution", sql.Bit, method === "mpesa" ? Boolean(isCashSubstitution) : null)
      .input("CollectedByStaffId", sql.Int, collectedByStaffId ? Number(collectedByStaffId) : null)
      .output("PaymentId", sql.Int)
      .output("NewPaymentStatus", sql.NVarChar(20))
      .execute("usp_RecordPayment");

    const updated = await fetchTicketAndOrder(pool, Number(ticketId));
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`POST /api/orders/${ticketId}/payments failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to record payment", detail: message }, { status: 500 });
  }
}
