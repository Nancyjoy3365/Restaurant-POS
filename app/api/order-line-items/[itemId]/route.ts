import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { fetchLineItemContext, fetchTicketAndOrder, refreshOrderDetailTotals } from "@/lib/server/orders";

// Mirrors updateItemQty in lib/store.ts: qty<=0 removes the line entirely.
export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const { qty } = await request.json();
  if (typeof qty !== "number") {
    return NextResponse.json({ error: "qty must be a number" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    const context = await fetchLineItemContext(pool, Number(itemId));
    if (!context) return NextResponse.json({ error: "Line item not found" }, { status: 404 });

    if (qty <= 0) {
      await pool.request().input("OrderLineItemId", sql.Int, Number(itemId)).execute("usp_DeleteOrderLineItem");
    } else {
      await pool
        .request()
        .input("OrderLineItemId", sql.Int, Number(itemId))
        .input("Qty", sql.Decimal(8, 2), qty)
        .execute("usp_UpdateOrderLineItemQty");
    }
    await refreshOrderDetailTotals(pool, context.orderDetailId);

    const updated = await fetchTicketAndOrder(pool, context.orderId);
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`PATCH /api/order-line-items/${itemId} failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to update item", detail: message }, { status: 500 });
  }
}

// Mirrors removeItem in lib/store.ts.
export async function DELETE(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  try {
    const pool = await getPool();
    const context = await fetchLineItemContext(pool, Number(itemId));
    if (!context) return NextResponse.json({ error: "Line item not found" }, { status: 404 });

    await pool.request().input("OrderLineItemId", sql.Int, Number(itemId)).execute("usp_DeleteOrderLineItem");
    await refreshOrderDetailTotals(pool, context.orderDetailId);

    const updated = await fetchTicketAndOrder(pool, context.orderId);
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`DELETE /api/order-line-items/${itemId} failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to remove item", detail: message }, { status: 500 });
  }
}
