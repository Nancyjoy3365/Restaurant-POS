import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getPool, sql } from "@/lib/db";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/server/session";
import { blockedForMinutes, clearFailures, clientKey, recordFailure } from "@/lib/server/pinThrottle";
import type { StaffRole } from "@/lib/types";

function pinMatches(given: string, stored: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}

// The PIN is checked here, on the server — it's never sent to a browser.
// Success sets the signed session cookie every other API route requires.
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
    const [pinResult, staffResult] = await Promise.all([
      pool.request().query<{ PinHash: string }>("SELECT PinHash FROM dbo.StaffPin WHERE StaffPinId = 1"),
      pool
        .request()
        .input("StaffId", sql.Int, Number(staffId))
        .query<{ StaffId: number; Name: string; Role: StaffRole }>(
          "SELECT StaffId, Name, Role FROM dbo.Staff WHERE StaffId = @StaffId AND IsActive = 1"
        ),
    ]);
    const storedPin = pinResult.recordset[0]?.PinHash;
    const staff = staffResult.recordset[0];

    if (!storedPin || !staff || !pinMatches(pin, storedPin)) {
      recordFailure(key);
      return NextResponse.json({ error: "Incorrect PIN — try again." }, { status: 401 });
    }

    clearFailures(key);
    const response = NextResponse.json({ staffId: String(staff.StaffId), name: staff.Name, role: staff.Role });
    response.cookies.set(SESSION_COOKIE, createSessionToken(String(staff.StaffId), staff.Role), sessionCookieOptions);
    return response;
  } catch (err) {
    console.error("POST /api/auth/login failed:", err);
    return NextResponse.json({ error: "Couldn't check the PIN right now — please try again." }, { status: 500 });
  }
}
