import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import type { VendorPayment } from "@/lib/types";

type VendorPaymentRow = {
  VendorPaymentId: number;
  VendorId: number;
  Amount: number;
  Method: VendorPayment["method"];
  Reference: string | null;
  PaidAt: Date;
};

function toVendorPayment(row: VendorPaymentRow): VendorPayment {
  return {
    id: String(row.VendorPaymentId),
    vendorId: String(row.VendorId),
    amount: row.Amount,
    method: row.Method,
    reference: row.Reference ?? undefined,
    paidAt: row.PaidAt.getTime(),
  };
}

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query<VendorPaymentRow>("SELECT * FROM dbo.VendorPayment ORDER BY PaidAt DESC");
    return NextResponse.json(result.recordset.map(toVendorPayment));
  } catch (err) {
    console.error("GET /api/vendor-payments failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load vendor payments", detail: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { vendorId, amount, method, reference } = body;

  if (!vendorId || !amount || !method) {
    return NextResponse.json({ error: "vendorId, amount and method are required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("VendorId", sql.Int, Number(vendorId))
      .input("Amount", sql.Decimal(12, 2), amount)
      .input("Method", sql.NVarChar(10), method)
      .input("Reference", sql.NVarChar(100), reference ?? null)
      .output("VendorPaymentId", sql.Int)
      .execute("usp_RecordVendorPayout");

    const payment: VendorPayment = {
      id: String(result.output.VendorPaymentId),
      vendorId: String(vendorId),
      amount,
      method,
      reference: method === "mpesa" ? reference || undefined : undefined,
      paidAt: Date.now(),
    };
    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    console.error("POST /api/vendor-payments failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    const isBusinessRuleError =
      typeof err === "object" && err !== null && "number" in err && Number((err as { number?: number }).number) >= 50000;
    return NextResponse.json(
      { error: isBusinessRuleError ? message : "Failed to record vendor payout", detail: message },
      { status: isBusinessRuleError ? 400 : 500 }
    );
  }
}
