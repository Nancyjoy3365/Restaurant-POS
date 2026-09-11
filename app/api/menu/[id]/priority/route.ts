import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { isPriority } = await request.json();

  if (typeof isPriority !== "boolean") {
    return NextResponse.json({ error: "isPriority must be a boolean" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input("MenuItemId", sql.Int, Number(id))
      .input("IsPriority", sql.Bit, isPriority)
      .execute("usp_SetMenuItemPriority");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`POST /api/menu/${id}/priority failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to update priority", detail: message }, { status: 500 });
  }
}
