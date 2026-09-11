import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { fetchLineItemContext, fetchTicketAndOrder, refreshOrderDetailTotals } from "@/lib/server/orders";

export async function POST(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const { reason, staffId } = await request.json();
  if (!reason) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    const context = await fetchLineItemContext(pool, Number(itemId));
    if (!context) return NextResponse.json({ error: "Line item not found" }, { status: 404 });

    await pool
      .request()
      .input("OrderLineItemId", sql.Int, Number(itemId))
      .input("Reason", sql.NVarChar(500), reason)
      .input("StaffId", sql.Int, staffId ? Number(staffId) : null)
      .output("VoidEntryId", sql.Int)
      .execute("usp_VoidOrderLineItem");
    await refreshOrderDetailTotals(pool, context.orderDetailId);

    const updated = await fetchTicketAndOrder(pool, context.orderId);
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`POST /api/order-line-items/${itemId}/void failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to void item", detail: message }, { status: 500 });
  }
}
