import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const pool = await getPool();
    await pool.request().input("StaffId", sql.Int, Number(id)).execute("usp_ClockOut");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`POST /api/staff/${id}/clock-out failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to clock out", detail: message }, { status: 500 });
  }
}
