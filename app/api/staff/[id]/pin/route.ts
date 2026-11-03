import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { isValidPin, pinMatches, sharedPin } from "@/lib/server/pins";

// Admin only (see lib/server/permissions.ts): set someone's PIN — e.g. when
// they've forgotten theirs — or clear it with `pin: null`, which sends them
// back through the shared-PIN first login to choose a new one themselves.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { pin } = await request.json().catch(() => ({}));
  if (pin !== null && !isValidPin(pin)) {
    return NextResponse.json({ error: "PIN must be exactly 3 digits." }, { status: 400 });
  }

  try {
    const pool = await getPool();
    if (pin !== null) {
      const shared = await sharedPin(pool);
      if (shared && pinMatches(pin, shared)) {
        return NextResponse.json(
          { error: "Choose a PIN that's different from the shared one." },
          { status: 400 }
        );
      }
    }
    const result = await pool
      .request()
      .input("StaffId", sql.Int, Number(id))
      .input("Pin", sql.NVarChar(3), pin)
      .query("UPDATE dbo.Staff SET Pin = @Pin WHERE StaffId = @StaffId AND IsActive = 1");
    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`POST /api/staff/${id}/pin failed:`, err);
    return NextResponse.json({ error: "Failed to set PIN" }, { status: 500 });
  }
}
