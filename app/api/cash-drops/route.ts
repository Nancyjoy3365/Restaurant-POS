import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import type { CashDrop } from "@/lib/types";

type CashDropRow = {
  CashDropId: number;
  WaiterId: number;
  Amount: number;
  ExpectedAmount: number;
  Method: CashDrop["method"];
  Reference: string | null;
  Note: string | null;
  DroppedAt: Date;
};

function toCashDrop(row: CashDropRow): CashDrop {
  return {
    id: String(row.CashDropId),
    waiterId: String(row.WaiterId),
    amount: row.Amount,
    expectedAmount: row.ExpectedAmount,
    method: row.Method,
    reference: row.Reference ?? undefined,
    note: row.Note ?? undefined,
    droppedAt: row.DroppedAt.getTime(),
  };
}

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query<CashDropRow>("SELECT * FROM dbo.CashDrop ORDER BY DroppedAt DESC");
    return NextResponse.json(result.recordset.map(toCashDrop));
  } catch (err) {
    console.error("GET /api/cash-drops failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load cash drops", detail: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { waiterId, amount, expectedAmount, method, reference, note } = body;

  if (!waiterId || !amount || expectedAmount === undefined || !method) {
    return NextResponse.json(
      { error: "waiterId, amount, expectedAmount and method are required" },
      { status: 400 }
    );
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("WaiterId", sql.Int, Number(waiterId))
      .input("Amount", sql.Decimal(12, 2), amount)
      .input("ExpectedAmount", sql.Decimal(12, 2), expectedAmount)
      .input("Method", sql.NVarChar(10), method)
      .input("Reference", sql.NVarChar(100), reference ?? null)
      .input("Note", sql.NVarChar(500), note ?? null)
      .output("CashDropId", sql.Int)
      .execute("usp_RecordCashDrop");

    const cashDrop: CashDrop = {
      id: String(result.output.CashDropId),
      waiterId: String(waiterId),
      amount,
      expectedAmount,
      method,
      reference: method === "mpesa" ? reference?.trim() || undefined : undefined,
      note: amount > expectedAmount ? note?.trim() || undefined : undefined,
      droppedAt: Date.now(),
    };
    return NextResponse.json(cashDrop, { status: 201 });
  } catch (err) {
    console.error("POST /api/cash-drops failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    const isBusinessRuleError =
      typeof err === "object" && err !== null && "number" in err && Number((err as { number?: number }).number) >= 50000;
    return NextResponse.json(
      { error: isBusinessRuleError ? message : "Failed to record cash drop", detail: message },
      { status: isBusinessRuleError ? 400 : 500 }
    );
  }
}
