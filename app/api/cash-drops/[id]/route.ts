import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const pool = await getPool();
    await pool.request().input("CashDropId", sql.Int, Number(id)).execute("usp_DeleteCashDrop");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/cash-drops/${id} failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to delete cash drop", detail: message }, { status: 500 });
  }
}
