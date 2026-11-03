import { timingSafeEqual } from "crypto";
import type { ConnectionPool } from "mssql";

// Every staff member has their own 3-digit PIN (Staff.Pin, plain digits —
// see database/12_personal_pins.sql). The old shared PIN (dbo.StaffPin)
// only remains as the one-time way in for someone who hasn't chosen theirs.

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{3}$/.test(pin);
}

export function pinMatches(given: string, stored: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function sharedPin(pool: ConnectionPool): Promise<string | null> {
  const result = await pool
    .request()
    .query<{ PinHash: string }>("SELECT PinHash FROM dbo.StaffPin WHERE StaffPinId = 1");
  return result.recordset[0]?.PinHash ?? null;
}
