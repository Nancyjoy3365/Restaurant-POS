import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { fetchTicketAndOrder } from "@/lib/server/orders";

const MAX_HELD_ORDERS_PER_WAITER = 3;

// Mirrors holdOrder in lib/store.ts: no-op if already held, if the order
// has no items yet, or if this waiter is already at the held-orders cap.
export async function POST(_request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  try {
    const pool = await getPool();
    const orderResult = await pool
      .request()
      .input("OrderId", sql.Int, Number(ticketId))
      .query<{ OrderDetailId: number; WaiterId: number; OnHold: boolean; ItemCount: number }>(
        `SELECT od.OrderDetailId, o.WaiterId, od.OnHold,
                (SELECT COUNT(*) FROM dbo.[Round] r INNER JOIN dbo.OrderLineItem oli ON oli.RoundId = r.RoundId WHERE r.OrderDetailId = od.OrderDetailId) AS ItemCount
         FROM dbo.OrderDetail od INNER JOIN dbo.[Order] o ON o.OrderId = od.OrderId
         WHERE od.OrderId = @OrderId`
      );
    const row = orderResult.recordset[0];
    if (!row) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    if (!row.OnHold && row.ItemCount > 0) {
      const heldCountResult = await pool
        .request()
        .input("WaiterId", sql.Int, row.WaiterId)
        .query<{ HeldCount: number }>(
          `SELECT COUNT(*) AS HeldCount FROM dbo.OrderDetail od INNER JOIN dbo.[Order] o ON o.OrderId = od.OrderId
           WHERE o.WaiterId = @WaiterId AND od.OnHold = 1`
        );
      if (heldCountResult.recordset[0].HeldCount < MAX_HELD_ORDERS_PER_WAITER) {
        await pool
          .request()
          .input("OrderDetailId", sql.Int, row.OrderDetailId)
          .input("OnHold", sql.Bit, true)
          .execute("usp_SetOrderOnHold");
      }
    }

    const updated = await fetchTicketAndOrder(pool, Number(ticketId));
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`POST /api/orders/${ticketId}/hold failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to hold order", detail: message }, { status: 500 });
  }
}
