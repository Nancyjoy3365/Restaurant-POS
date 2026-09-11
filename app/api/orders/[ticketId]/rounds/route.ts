import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { fetchTicketAndOrder } from "@/lib/server/orders";

// Mirrors addRound in lib/store.ts: reuses the trailing round if it's
// already empty instead of piling on another unused one.
export async function POST(_request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  try {
    const pool = await getPool();
    const orderDetailResult = await pool
      .request()
      .input("OrderId", sql.Int, Number(ticketId))
      .query<{ OrderDetailId: number }>("SELECT OrderDetailId FROM dbo.OrderDetail WHERE OrderId = @OrderId");
    const orderDetailId = orderDetailResult.recordset[0]?.OrderDetailId;
    if (!orderDetailId) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const lastRoundResult = await pool
      .request()
      .input("OrderDetailId", sql.Int, orderDetailId)
      .query<{ RoundId: number; ItemCount: number }>(
        `SELECT TOP (1) r.RoundId, (SELECT COUNT(*) FROM dbo.OrderLineItem WHERE RoundId = r.RoundId) AS ItemCount
         FROM dbo.[Round] r WHERE r.OrderDetailId = @OrderDetailId ORDER BY r.RoundIndex DESC`
      );
    const lastRound = lastRoundResult.recordset[0];

    if (!lastRound || lastRound.ItemCount > 0) {
      const nextIndexResult = await pool
        .request()
        .input("OrderDetailId", sql.Int, orderDetailId)
        .query<{ NextIndex: number }>(
          "SELECT ISNULL(MAX(RoundIndex), 0) + 1 AS NextIndex FROM dbo.[Round] WHERE OrderDetailId = @OrderDetailId"
        );
      await pool
        .request()
        .input("OrderDetailId", sql.Int, orderDetailId)
        .input("RoundIndex", sql.Int, nextIndexResult.recordset[0].NextIndex)
        .query("INSERT INTO dbo.[Round] (OrderDetailId, RoundIndex, CreatedAt) VALUES (@OrderDetailId, @RoundIndex, SYSUTCDATETIME())");
    }

    const updated = await fetchTicketAndOrder(pool, Number(ticketId));
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`POST /api/orders/${ticketId}/rounds failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to add round", detail: message }, { status: 500 });
  }
}
