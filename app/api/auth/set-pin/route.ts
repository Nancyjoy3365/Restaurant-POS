import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  sessionFromRequest,
} from "@/lib/server/session";
import { isValidPin, pinMatches, sharedPin } from "@/lib/server/pins";

// The logged-in person chooses their own PIN — the step that follows a
// first login with the old shared PIN. Success swaps their session for a
// normal one.
export async function POST(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

  const { newPin } = await request.json().catch(() => ({}));
  if (!isValidPin(newPin)) {
    return NextResponse.json({ error: "Your PIN must be exactly 3 digits." }, { status: 400 });
  }

  try {
    const pool = await getPool();
    // Keeping the shared PIN would defeat the point of having your own.
    const shared = await sharedPin(pool);
    if (shared && pinMatches(newPin, shared)) {
      return NextResponse.json(
        { error: "Choose a PIN that's different from the shared one." },
        { status: 400 }
      );
    }

    await pool
      .request()
      .input("StaffId", sql.Int, Number(session.staffId))
      .input("Pin", sql.NVarChar(3), newPin)
      .query("UPDATE dbo.Staff SET Pin = @Pin WHERE StaffId = @StaffId");

    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken(session.staffId, session.role),
      sessionCookieOptions
    );
    return response;
  } catch (err) {
    console.error("POST /api/auth/set-pin failed:", err);
    return NextResponse.json({ error: "Couldn't save your PIN — please try again." }, { status: 500 });
  }
}
