import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { fetchTicketAndOrder } from "@/lib/server/orders";

export async function POST(_request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  try {
    const pool = await getPool();
    const orderDetailResult = await pool
      .request()
      .input("OrderId", sql.Int, Number(ticketId))
      .query<{ OrderDetailId: number }>("SELECT OrderDetailId FROM dbo.OrderDetail WHERE OrderId = @OrderId");
    const orderDetailId = orderDetailResult.recordset[0]?.OrderDetailId;
    if (!orderDetailId) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    await pool.request().input("OrderDetailId", sql.Int, orderDetailId).execute("usp_MarkAllLineItemsReadyForOrder");
    await pool
      .request()
      .input("OrderDetailId", sql.Int, orderDetailId)
      .input("OnHold", sql.Bit, false)
      .execute("usp_SetOrderOnHold");

    const updated = await fetchTicketAndOrder(pool, Number(ticketId));
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`POST /api/orders/${ticketId}/ready-all failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to mark items ready", detail: message }, { status: 500 });
  }
}
