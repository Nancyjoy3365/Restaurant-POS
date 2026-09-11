import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { fetchLineItemContext, fetchTicketAndOrder } from "@/lib/server/orders";

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const { note } = await request.json();

  try {
    const pool = await getPool();
    const context = await fetchLineItemContext(pool, Number(itemId));
    if (!context) return NextResponse.json({ error: "Line item not found" }, { status: 404 });

    await pool
      .request()
      .input("OrderLineItemId", sql.Int, Number(itemId))
      .input("Note", sql.NVarChar(500), (note ?? "").trim() || null)
      .execute("usp_UpdateOrderLineItemNote");

    const updated = await fetchTicketAndOrder(pool, context.orderId);
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`PATCH /api/order-line-items/${itemId}/note failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to update note", detail: message }, { status: 500 });
  }
}
