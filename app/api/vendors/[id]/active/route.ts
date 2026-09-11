import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { active } = body;

  if (typeof active !== "boolean") {
    return NextResponse.json({ error: "active must be a boolean" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input("VendorId", sql.Int, Number(id))
      .input("IsActive", sql.Bit, active)
      .execute("usp_SetVendorActive");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`POST /api/vendors/${id}/active failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    // usp_SetVendorActive THROWs a business-rule error (balance still owed)
    // with a custom number in the 50000s — surface that as a 400 the UI can
    // show, rather than a generic 500.
    const isBusinessRuleError =
      typeof err === "object" && err !== null && "number" in err && Number(err.number) >= 50000;
    return NextResponse.json(
      { error: isBusinessRuleError ? message : "Failed to update vendor status", detail: message },
      { status: isBusinessRuleError ? 400 : 500 }
    );
  }
}
