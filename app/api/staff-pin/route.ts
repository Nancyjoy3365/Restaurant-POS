import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { blockedForMinutes, clearFailures, clientKey, recordFailure } from "@/lib/server/pinThrottle";
import { isValidPin, pinMatches, sharedPin } from "@/lib/server/pins";

// Changes one person's own PIN. There is deliberately no GET: PINs are only
// ever checked on the server (see /api/auth/login) and never sent to a
// browser.
//
// Offered on the login screen, so it needs no session — but it requires
// that person's current PIN (or the shared PIN if they haven't set their
// own yet) and shares the login's wrong-PIN limit, so it can't be used to
// guess anyone's PIN either.
export async function POST(request: Request) {
  const key = clientKey(request);
  const wait = blockedForMinutes(key);
  if (wait > 0) {
    return NextResponse.json(
      { error: `Too many wrong PINs. Try again in ${wait} minute${wait === 1 ? "" : "s"}.` },
      { status: 429 }
    );
  }

  const { staffId, currentPin, newPin } = await request.json().catch(() => ({}));
  if (!staffId || typeof currentPin !== "string") {
    return NextResponse.json({ error: "staffId, currentPin and newPin are required" }, { status: 400 });
  }
  if (!isValidPin(newPin)) {
    return NextResponse.json({ error: "New PIN must be exactly 3 digits." }, { status: 400 });
  }

  try {
    const pool = await getPool();
    const staffResult = await pool
      .request()
      .input("StaffId", sql.Int, Number(staffId))
      .query<{ Pin: string | null }>("SELECT Pin FROM dbo.Staff WHERE StaffId = @StaffId AND IsActive = 1");
    const staff = staffResult.recordset[0];
    const shared = await sharedPin(pool);
    const expected = staff ? (staff.Pin ?? shared) : null;

    if (!expected || !pinMatches(currentPin, expected)) {
      recordFailure(key);
      return NextResponse.json({ error: "Current PIN is incorrect." }, { status: 400 });
    }
    if (shared && pinMatches(newPin, shared)) {
      return NextResponse.json(
        { error: "Choose a PIN that's different from the shared one." },
        { status: 400 }
      );
    }

    await pool
      .request()
      .input("StaffId", sql.Int, Number(staffId))
      .input("Pin", sql.NVarChar(3), newPin)
      .query("UPDATE dbo.Staff SET Pin = @Pin WHERE StaffId = @StaffId");

    clearFailures(key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/staff-pin failed:", err);
    return NextResponse.json({ error: "Failed to change PIN" }, { status: 500 });
  }
}
