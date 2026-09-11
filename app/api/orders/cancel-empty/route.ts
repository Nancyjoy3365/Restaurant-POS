import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

// Mirrors cancelEmptyTickets/purgeEmptyTickets in lib/store.ts — sweeps
// every open ticket that never had a single item added to it.
export async function POST() {
  try {
    const pool = await getPool();
    await pool.request().execute("usp_DeleteEmptyOrders");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/orders/cancel-empty failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to clean up empty tickets", detail: message }, { status: 500 });
  }
}
