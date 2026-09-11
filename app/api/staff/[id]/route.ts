import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { name, role, title, payType, rate, phone, commissionType, commissionValue } = body;

  if (!name || !role || !payType) {
    return NextResponse.json({ error: "name, role and payType are required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input("StaffId", sql.Int, Number(id))
      .input("Name", sql.NVarChar(150), name)
      .input("Role", sql.NVarChar(30), role)
      .input("Title", sql.NVarChar(100), title ?? null)
      .input("PayType", sql.NVarChar(20), payType)
      .input("Rate", sql.Decimal(12, 2), rate ?? 0)
      .input("Phone", sql.NVarChar(30), phone ?? null)
      .input("CommissionType", sql.NVarChar(30), commissionType ?? null)
      .input("CommissionValue", sql.Decimal(12, 4), commissionValue ?? null)
      .execute("usp_UpdateStaff");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`PATCH /api/staff/${id} failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to update staff member", detail: message }, { status: 500 });
  }
}
