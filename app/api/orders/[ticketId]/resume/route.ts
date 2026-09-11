import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { fetchTicketAndOrder } from "@/lib/server/orders";

export async function POST(_request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  try {
    const pool = await getPool();
    await pool
      .request()
      .input("OrderId", sql.Int, Number(ticketId))
      .query(
        `UPDATE od SET OnHold = 0 FROM dbo.OrderDetail od WHERE od.OrderId = @OrderId AND od.OnHold = 1`
      );

    const updated = await fetchTicketAndOrder(pool, Number(ticketId));
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`POST /api/orders/${ticketId}/resume failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to resume order", detail: message }, { status: 500 });
  }
}
