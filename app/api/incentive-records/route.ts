import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import type { IncentiveRecord } from "@/lib/types";

type IncentiveRecordRow = {
  IncentiveRecordId: number;
  StaffId: number;
  Amount: number;
  Reason: string;
  DateGiven: Date;
  GivenBy: string | null;
};

function toIncentiveRecord(row: IncentiveRecordRow): IncentiveRecord {
  return {
    id: String(row.IncentiveRecordId),
    staffId: String(row.StaffId),
    amount: row.Amount,
    reason: row.Reason,
    dateGiven: row.DateGiven.getTime(),
    givenBy: row.GivenBy ?? undefined,
  };
}

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query<IncentiveRecordRow>("SELECT * FROM dbo.IncentiveRecord ORDER BY DateGiven DESC");
    return NextResponse.json(result.recordset.map(toIncentiveRecord));
  } catch (err) {
    console.error("GET /api/incentive-records failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load incentive records", detail: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { staffId, amount, reason, dateGiven, givenBy } = body;

  if (!staffId || !amount || !reason) {
    return NextResponse.json({ error: "staffId, amount and reason are required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("StaffId", sql.Int, Number(staffId))
      .input("Amount", sql.Decimal(12, 2), amount)
      .input("Reason", sql.NVarChar(500), reason)
      .input("DateGiven", sql.DateTime2(3), dateGiven ? new Date(dateGiven) : new Date())
      // Mirrors the app exactly: `givenBy` is populated with the acting
      // staff member's raw id (see IncentiveModal.tsx), not a display name —
      // it's stored as free text and never rendered back in the UI today.
      .input("GivenBy", sql.NVarChar(150), givenBy ?? null)
      .output("IncentiveRecordId", sql.Int)
      .execute("usp_CreateIncentiveRecord");

    const incentiveRecord: IncentiveRecord = {
      id: String(result.output.IncentiveRecordId),
      staffId: String(staffId),
      amount,
      reason,
      dateGiven: dateGiven ?? Date.now(),
      givenBy: givenBy ?? undefined,
    };
    return NextResponse.json(incentiveRecord, { status: 201 });
  } catch (err) {
    console.error("POST /api/incentive-records failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to create incentive record", detail: message }, { status: 500 });
  }
}
