import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import type { LeaveRecord } from "@/lib/types";

type LeaveRecordRow = {
  LeaveRecordId: number;
  StaffId: number;
  StartDate: Date;
  EndDate: Date;
  Reason: string;
  Status: LeaveRecord["status"];
  IsPaid: boolean;
  RequestedAt: Date | null;
  DeclineReason: string | null;
};

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toLeaveRecord(row: LeaveRecordRow): LeaveRecord {
  return {
    id: String(row.LeaveRecordId),
    staffId: String(row.StaffId),
    startDate: toDateKey(row.StartDate),
    endDate: toDateKey(row.EndDate),
    reason: row.Reason,
    status: row.Status,
    isPaid: row.IsPaid,
    requestedAt: row.RequestedAt ? row.RequestedAt.getTime() : undefined,
    declineReason: row.DeclineReason ?? undefined,
  };
}

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query<LeaveRecordRow>("SELECT * FROM dbo.LeaveRecord ORDER BY StartDate DESC");
    return NextResponse.json(result.recordset.map(toLeaveRecord));
  } catch (err) {
    console.error("GET /api/leave-records failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load leave records", detail: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { staffId, startDate, endDate, reason, status, isPaid, requestedAt } = body;

  if (!staffId || !startDate || !endDate || !status) {
    return NextResponse.json(
      { error: "staffId, startDate, endDate and status are required" },
      { status: 400 }
    );
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("StaffId", sql.Int, Number(staffId))
      .input("StartDate", sql.Date, startDate)
      .input("EndDate", sql.Date, endDate)
      .input("Reason", sql.NVarChar(500), reason ?? "")
      .input("Status", sql.NVarChar(20), status)
      .input("IsPaid", sql.Bit, Boolean(isPaid))
      .input("RequestedAt", sql.DateTime2(3), requestedAt ? new Date(requestedAt) : new Date())
      .output("LeaveRecordId", sql.Int)
      .execute("usp_CreateLeaveRecord");

    const leaveRecord: LeaveRecord = {
      id: String(result.output.LeaveRecordId),
      staffId: String(staffId),
      startDate,
      endDate,
      reason: reason ?? "",
      status,
      isPaid: Boolean(isPaid),
      requestedAt: requestedAt ?? Date.now(),
    };
    return NextResponse.json(leaveRecord, { status: 201 });
  } catch (err) {
    console.error("POST /api/leave-records failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to create leave record", detail: message }, { status: 500 });
  }
}
