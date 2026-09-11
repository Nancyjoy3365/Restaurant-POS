import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { available } = await request.json();

  if (typeof available !== "boolean") {
    return NextResponse.json({ error: "available must be a boolean" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input("MenuItemId", sql.Int, Number(id))
      .input("IsAvailable", sql.Bit, available)
      .execute("usp_SetMenuItemAvailable");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`POST /api/menu/${id}/availability failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to update availability", detail: message }, { status: 500 });
  }
}
