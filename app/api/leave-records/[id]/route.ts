import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { startDate, endDate, reason, status, isPaid, declineReason } = body;

  if (!startDate || !endDate || !status) {
    return NextResponse.json({ error: "startDate, endDate and status are required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input("LeaveRecordId", sql.Int, Number(id))
      .input("StartDate", sql.Date, startDate)
      .input("EndDate", sql.Date, endDate)
      .input("Reason", sql.NVarChar(500), reason ?? "")
      .input("Status", sql.NVarChar(20), status)
      .input("IsPaid", sql.Bit, Boolean(isPaid))
      .input("DeclineReason", sql.NVarChar(500), declineReason ?? null)
      .execute("usp_UpdateLeaveRecord");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`PATCH /api/leave-records/${id} failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to update leave record", detail: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const pool = await getPool();
    await pool.request().input("LeaveRecordId", sql.Int, Number(id)).execute("usp_DeleteLeaveRecord");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/leave-records/${id} failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to delete leave record", detail: message }, { status: 500 });
  }
}
