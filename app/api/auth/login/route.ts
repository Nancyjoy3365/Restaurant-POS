import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/server/session";
import { blockedForMinutes, clearFailures, clientKey, recordFailure } from "@/lib/server/pinThrottle";
import { pinMatches, sharedPin } from "@/lib/server/pins";
import type { StaffRole } from "@/lib/types";

// The PIN is checked here, on the server — it's never sent to a browser.
// Each person logs in with their own PIN; someone who hasn't chosen one yet
// gets in once with the old shared PIN, in a session that can only be used
// to set their own (see mustSetPin in lib/server/session.ts).
export async function POST(request: Request) {
  const key = clientKey(request);
  const wait = blockedForMinutes(key);
  if (wait > 0) {
    return NextResponse.json(
      { error: `Too many wrong PINs. Try again in ${wait} minute${wait === 1 ? "" : "s"}.` },
      { status: 429 }
    );
  }

  const { staffId, pin } = await request.json().catch(() => ({}));
  if (!staffId || typeof pin !== "string") {
    return NextResponse.json({ error: "staffId and pin are required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    const staffResult = await pool
      .request()
      .input("StaffId", sql.Int, Number(staffId))
      .query<{ StaffId: number; Name: string; Role: StaffRole; Pin: string | null }>(
        "SELECT StaffId, Name, Role, Pin FROM dbo.Staff WHERE StaffId = @StaffId AND IsActive = 1"
      );
    const staff = staffResult.recordset[0];

    let mustSetPin = false;
    let ok = false;
    if (staff?.Pin) {
      ok = pinMatches(pin, staff.Pin);
    } else if (staff) {
      const shared = await sharedPin(pool);
      ok = shared !== null && pinMatches(pin, shared);
      mustSetPin = ok;
    }

    if (!ok) {
      recordFailure(key);
      return NextResponse.json({ error: "Incorrect PIN — try again." }, { status: 401 });
    }

    clearFailures(key);
    const response = NextResponse.json({
      staffId: String(staff.StaffId),
      name: staff.Name,
      role: staff.Role,
      mustSetPin,
    });
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken(String(staff.StaffId), staff.Role, { mustSetPin }),
      sessionCookieOptions
    );
    return response;
  } catch (err) {
    console.error("POST /api/auth/login failed:", err);
    return NextResponse.json({ error: "Couldn't check the PIN right now — please try again." }, { status: 500 });
  }
}
