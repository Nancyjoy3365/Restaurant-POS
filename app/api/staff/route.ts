import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import type { StaffMember } from "@/lib/types";

type StaffRow = {
  StaffId: number;
  Name: string;
  Role: StaffMember["role"];
  Title: string | null;
  PayType: StaffMember["payType"];
  Rate: number;
  Phone: string | null;
  CommissionType: StaffMember["commissionType"] | null;
  CommissionValue: number | null;
};

function toStaffMember(row: StaffRow): StaffMember {
  return {
    id: String(row.StaffId),
    name: row.Name,
    role: row.Role,
    title: row.Title ?? undefined,
    payType: row.PayType,
    rate: row.Rate,
    phone: row.Phone ?? undefined,
    commissionType: row.CommissionType ?? undefined,
    commissionValue: row.CommissionValue ?? undefined,
  };
}

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query<StaffRow>(
        "SELECT StaffId, Name, Role, Title, PayType, Rate, Phone, CommissionType, CommissionValue FROM dbo.Staff WHERE IsActive = 1 ORDER BY Name"
      );
    return NextResponse.json(result.recordset.map(toStaffMember));
  } catch (err) {
    console.error("GET /api/staff failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load staff", detail: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, role, title, payType, rate, phone, commissionType, commissionValue } = body;

  if (!name || !role || !payType) {
    return NextResponse.json({ error: "name, role and payType are required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("Name", sql.NVarChar(150), name)
      .input("Role", sql.NVarChar(30), role)
      .input("Title", sql.NVarChar(100), title ?? null)
      .input("PayType", sql.NVarChar(20), payType)
      .input("Rate", sql.Decimal(12, 2), rate ?? 0)
      .input("Phone", sql.NVarChar(30), phone ?? null)
      .input("CommissionType", sql.NVarChar(30), commissionType ?? null)
      .input("CommissionValue", sql.Decimal(12, 4), commissionValue ?? null)
      .output("StaffId", sql.Int)
      .execute("usp_CreateStaff");

    const staffMember: StaffMember = {
      id: String(result.output.StaffId),
      name,
      role,
      title: title || undefined,
      payType,
      rate: rate ?? 0,
      phone: phone || undefined,
      commissionType: commissionType || undefined,
      commissionValue: commissionValue ?? undefined,
    };
    return NextResponse.json(staffMember, { status: 201 });
  } catch (err) {
    console.error("POST /api/staff failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to create staff member", detail: message }, { status: 500 });
  }
}
