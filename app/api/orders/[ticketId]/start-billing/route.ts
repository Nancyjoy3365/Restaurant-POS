import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { fetchTicketAndOrder, fetchVatRate } from "@/lib/server/orders";

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

    const vatRate = await fetchVatRate(pool);
    await pool
      .request()
      .input("OrderDetailId", sql.Int, orderDetailId)
      .input("VatRate", sql.Decimal(5, 4), vatRate)
      .execute("usp_StartBilling");

    const updated = await fetchTicketAndOrder(pool, Number(ticketId));
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`POST /api/orders/${ticketId}/start-billing failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to start billing", detail: message }, { status: 500 });
  }
}
