import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { fetchTicketAndOrder } from "@/lib/server/orders";

// Mirrors sendRoundToKitchen in lib/store.ts: stamps the round sent, then
// starts a fresh empty round for whatever's ordered next, and holds the
// ticket (handed off to the kitchen) until the waiter resumes it.
export async function POST(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  try {
    const pool = await getPool();

    const roundResult = await pool
      .request()
      .input("RoundId", sql.Int, Number(roundId))
      .query<{ OrderDetailId: number; OrderId: number; ItemCount: number }>(
        `SELECT r.OrderDetailId, od.OrderId, (SELECT COUNT(*) FROM dbo.OrderLineItem WHERE RoundId = r.RoundId) AS ItemCount
         FROM dbo.[Round] r INNER JOIN dbo.OrderDetail od ON od.OrderDetailId = r.OrderDetailId
         WHERE r.RoundId = @RoundId`
      );
    const row = roundResult.recordset[0];
    if (!row) return NextResponse.json({ error: "Round not found" }, { status: 404 });
    if (row.ItemCount === 0) {
      return NextResponse.json({ error: "Round has no items to send" }, { status: 400 });
    }

    await pool.request().input("RoundId", sql.Int, Number(roundId)).execute("usp_SendRoundToKitchen");

    const nextIndexResult = await pool
      .request()
      .input("OrderDetailId", sql.Int, row.OrderDetailId)
      .query<{ NextIndex: number }>(
        "SELECT ISNULL(MAX(RoundIndex), 0) + 1 AS NextIndex FROM dbo.[Round] WHERE OrderDetailId = @OrderDetailId"
      );
    await pool
      .request()
      .input("OrderDetailId", sql.Int, row.OrderDetailId)
      .input("RoundIndex", sql.Int, nextIndexResult.recordset[0].NextIndex)
      .query(
        "INSERT INTO dbo.[Round] (OrderDetailId, RoundIndex, CreatedAt) VALUES (@OrderDetailId, @RoundIndex, SYSUTCDATETIME())"
      );

    await pool
      .request()
      .input("OrderDetailId", sql.Int, row.OrderDetailId)
      .input("OnHold", sql.Bit, true)
      .execute("usp_SetOrderOnHold");

    const updated = await fetchTicketAndOrder(pool, row.OrderId);
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`POST /api/rounds/${roundId}/send failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to send round to kitchen", detail: message }, { status: 500 });
  }
}
