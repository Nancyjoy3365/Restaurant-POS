import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { fetchLineItemContext, fetchTicketAndOrder } from "@/lib/server/orders";

// Mirrors toggleItemReady in lib/store.ts: the moment every sent item is
// ready, the kitchen's part is done — hand the ticket back to the waiter
// automatically (clear OnHold) rather than requiring a separate tap.
export async function POST(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const { ready } = await request.json();
  if (typeof ready !== "boolean") {
    return NextResponse.json({ error: "ready must be a boolean" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    const context = await fetchLineItemContext(pool, Number(itemId));
    if (!context) return NextResponse.json({ error: "Line item not found" }, { status: 404 });

    await pool
      .request()
      .input("OrderLineItemId", sql.Int, Number(itemId))
      .input("KitchenReady", sql.Bit, ready)
      .execute("usp_SetLineItemReady");

    const allReadyResult = await pool
      .request()
      .input("OrderDetailId", sql.Int, context.orderDetailId)
      .query<{ NotReadyCount: number }>(
        `SELECT COUNT(*) AS NotReadyCount FROM dbo.OrderLineItem oli
         INNER JOIN dbo.[Round] r ON r.RoundId = oli.RoundId
         WHERE r.OrderDetailId = @OrderDetailId AND oli.SentToKitchen = 1 AND oli.KitchenReady = 0`
      );
    if (allReadyResult.recordset[0].NotReadyCount === 0) {
      await pool
        .request()
        .input("OrderDetailId", sql.Int, context.orderDetailId)
        .input("OnHold", sql.Bit, false)
        .execute("usp_SetOrderOnHold");
    }

    const updated = await fetchTicketAndOrder(pool, context.orderId);
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`POST /api/order-line-items/${itemId}/ready failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to update item ready state", detail: message }, { status: 500 });
  }
}
