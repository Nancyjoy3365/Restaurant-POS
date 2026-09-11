import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import type { ShiftEntry } from "@/lib/types";

type ShiftRow = {
  ShiftEntryId: number;
  StaffId: number;
  ClockIn: Date;
  ClockOut: Date | null;
};

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query<ShiftRow>("SELECT * FROM dbo.ShiftEntry ORDER BY ClockIn DESC");
    const shifts: ShiftEntry[] = result.recordset.map((row) => ({
      id: String(row.ShiftEntryId),
      staffId: String(row.StaffId),
      clockIn: row.ClockIn.getTime(),
      clockOut: row.ClockOut ? row.ClockOut.getTime() : undefined,
    }));
    return NextResponse.json(shifts);
  } catch (err) {
    console.error("GET /api/shifts failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load shifts", detail: message }, { status: 500 });
  }
}
