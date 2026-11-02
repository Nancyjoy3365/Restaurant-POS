import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { blockedForMinutes, clearFailures, clientKey, recordFailure } from "@/lib/server/pinThrottle";

// There is deliberately no GET: the PIN is only ever checked on the server
// (see /api/auth/login) and never sent to a browser.
//
// Changing it is offered on the login screen, so it needs no session — but
// it requires the current PIN (checked by usp_ChangeStaffPin) and shares the
// login's wrong-PIN limit, so it can't be used to guess the PIN either.
// `PinHash` still stores the raw value, as it always has.
export async function POST(request: Request) {
  const key = clientKey(request);
  const wait = blockedForMinutes(key);
  if (wait > 0) {
    return NextResponse.json(
      { error: `Too many wrong PINs. Try again in ${wait} minute${wait === 1 ? "" : "s"}.` },
      { status: 429 }
    );
  }

  const { currentPin, newPin } = await request.json().catch(() => ({}));
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

    clearFailures(key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/staff-pin failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    const isBusinessRuleError =
      typeof err === "object" && err !== null && "number" in err && Number((err as { number?: number }).number) >= 50000;
    if (isBusinessRuleError) recordFailure(key);
    return NextResponse.json(
      { error: isBusinessRuleError ? message : "Failed to change PIN", detail: message },
      { status: isBusinessRuleError ? 400 : 500 }
    );
  }
}
