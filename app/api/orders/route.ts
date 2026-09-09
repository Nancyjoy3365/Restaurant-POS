import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

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
      .input("WaiterId", sql.Int, waiterId)
      .input("OrderType", sql.NVarChar(20), orderType ?? "dine_in")
      .input("LocationNote", sql.NVarChar(200), locationNote ?? null)
      .input("CustomerName", sql.NVarChar(150), customerName ?? null)
      .input("CustomerPhone", sql.NVarChar(30), customerPhone ?? null)
      .output("OrderId", sql.Int)
      .output("DisplayNumber", sql.Int)
      .execute("usp_CreateOrder");

    return NextResponse.json({
      orderId: result.output.OrderId,
      displayNumber: result.output.DisplayNumber,
    });
  } catch (err) {
    console.error("usp_CreateOrder failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to create order", detail: message }, { status: 500 });
  }
}
