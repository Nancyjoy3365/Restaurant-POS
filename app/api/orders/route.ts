import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { fetchOpenTicketsAndOrders, fetchTicketAndOrder } from "@/lib/server/orders";

export async function GET() {
  try {
    const pool = await getPool();
    return NextResponse.json(await fetchOpenTicketsAndOrders(pool));
  } catch (err) {
    console.error("GET /api/orders failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load orders", detail: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { waiterId, orderType, locationNote, customerName, customerPhone } = body;

  if (!waiterId) {
    return NextResponse.json({ error: "waiterId is required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("WaiterId", sql.Int, Number(waiterId))
      .input("OrderType", sql.NVarChar(20), orderType ?? "dine_in")
      .input("LocationNote", sql.NVarChar(200), locationNote ?? null)
      .input("CustomerName", sql.NVarChar(150), customerName ?? null)
      .input("CustomerPhone", sql.NVarChar(30), customerPhone ?? null)
      .output("OrderId", sql.Int)
      .output("DisplayNumber", sql.Int)
      .execute("usp_CreateOrder");
    const orderId = result.output.OrderId as number;

    // usp_CreateOrder only creates Order+OrderDetail — mirrors createTicket
    // in lib/store.ts, which always seeds a ticket with one empty first
    // round ready to take items.
    const orderDetailResult = await pool
      .request()
      .input("OrderId", sql.Int, orderId)
      .query<{ OrderDetailId: number }>("SELECT OrderDetailId FROM dbo.OrderDetail WHERE OrderId = @OrderId");
    await pool
      .request()
      .input("OrderDetailId", sql.Int, orderDetailResult.recordset[0].OrderDetailId)
      .output("RoundId", sql.Int)
      .output("RoundIndex", sql.Int)
      .execute("usp_StartOrderRound");

    const created = await fetchTicketAndOrder(pool, orderId);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/orders failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to create order", detail: message }, { status: 500 });
  }
}
