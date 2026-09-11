import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import type { Vendor } from "@/lib/types";

type VendorRow = {
  VendorId: number;
  Name: string;
  Category: string;
  IsActive: boolean;
  ContactPerson: string | null;
  Phone: string | null;
  PaymentTerms: Vendor["paymentTerms"] | null;
};

function toVendor(row: VendorRow): Vendor {
  return {
    id: String(row.VendorId),
    name: row.Name,
    category: row.Category,
    active: row.IsActive,
    contactPerson: row.ContactPerson ?? undefined,
    phone: row.Phone ?? undefined,
    paymentTerms: row.PaymentTerms ?? undefined,
  };
}

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query<VendorRow>("SELECT VendorId, Name, Category, IsActive, ContactPerson, Phone, PaymentTerms FROM dbo.Vendor ORDER BY Name");
    return NextResponse.json(result.recordset.map(toVendor));
  } catch (err) {
    console.error("GET /api/vendors failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load vendors", detail: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, category, contactPerson, phone, paymentTerms } = body;

  if (!name || !category) {
    return NextResponse.json({ error: "name and category are required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("Name", sql.NVarChar(150), name)
      .input("Category", sql.NVarChar(100), category)
      .input("ContactPerson", sql.NVarChar(150), contactPerson ?? null)
      .input("Phone", sql.NVarChar(30), phone ?? null)
      .input("PaymentTerms", sql.NVarChar(20), paymentTerms ?? "net-30")
      .output("VendorId", sql.Int)
      .execute("usp_CreateVendor");

    const vendor: Vendor = {
      id: String(result.output.VendorId),
      name,
      category,
      active: true,
      contactPerson: contactPerson || undefined,
      phone: phone || undefined,
      paymentTerms: paymentTerms ?? "net-30",
    };
    return NextResponse.json(vendor, { status: 201 });
  } catch (err) {
    console.error("POST /api/vendors failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to create vendor", detail: message }, { status: 500 });
  }
}
