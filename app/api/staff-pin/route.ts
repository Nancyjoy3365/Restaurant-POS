import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

// The whole app treats this as a plain shared 3-digit code today (see the
// comment on StaffPin in database/01_schema.sql and STAFF_PIN in
// lib/seed-data.ts) — login compares it client-side, so this mirrors that
// exactly rather than introducing new hashing the rest of the app doesn't
// have. `PinHash` stores the raw value, same as the app always has.
export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query<{ PinHash: string }>("SELECT PinHash FROM dbo.StaffPin WHERE StaffPinId = 1");
    const pin = result.recordset[0]?.PinHash ?? null;
    return NextResponse.json({ pin });
  } catch (err) {
    console.error("GET /api/staff-pin failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load PIN", detail: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { currentPin, newPin } = await request.json();
  if (!currentPin || !newPin) {
    return NextResponse.json({ error: "currentPin and newPin are required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input("CurrentPinHash", sql.NVarChar(256), currentPin)
      .input("NewPinHash", sql.NVarChar(256), newPin)
      .execute("usp_ChangeStaffPin");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/staff-pin failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    const isBusinessRuleError =
      typeof err === "object" && err !== null && "number" in err && Number((err as { number?: number }).number) >= 50000;
    return NextResponse.json(
      { error: isBusinessRuleError ? message : "Failed to change PIN", detail: message },
      { status: isBusinessRuleError ? 400 : 500 }
    );
  }
}
