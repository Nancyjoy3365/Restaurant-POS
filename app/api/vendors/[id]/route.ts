import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { name, category, contactPerson, phone, paymentTerms } = body;

  if (!name || !category) {
    return NextResponse.json({ error: "name and category are required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input("VendorId", sql.Int, Number(id))
      .input("Name", sql.NVarChar(150), name)
      .input("Category", sql.NVarChar(100), category)
      .input("ContactPerson", sql.NVarChar(150), contactPerson ?? null)
      .input("Phone", sql.NVarChar(30), phone ?? null)
      .input("PaymentTerms", sql.NVarChar(20), paymentTerms ?? "net-30")
      .execute("usp_UpdateVendor");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`PATCH /api/vendors/${id} failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to update vendor", detail: message }, { status: 500 });
  }
}
