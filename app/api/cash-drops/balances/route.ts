import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import type { WaiterCashBalance } from "@/lib/types";
import { jsonWithEtag } from "@/lib/server/etag";

// All-time cash owed per staff member: cash taken + M-Pesa sent to their
// personal number, minus every cash drop they've made. Pending cash never
// resets at midnight, so this has to cover the whole history — summing it
// here means the cashier screen gets one row per person instead of
// downloading every payment and cash drop ever recorded.
type BalanceRow = {
  WaiterId: number;
  MpesaAmount: number;
  CashAmount: number;
  SubstitutionAmount: number;
  DropAmount: number;
};

export async function GET(request: Request) {
  try {
    const pool = await getPool();
    const result = await pool.request().query<BalanceRow>(
      `WITH p AS (
         SELECT WaiterId,
                SUM(CASE WHEN Method = 'mpesa' THEN Amount ELSE 0 END) AS MpesaAmount,
                SUM(CASE WHEN Method = 'cash' THEN Amount ELSE 0 END) AS CashAmount,
                SUM(CASE WHEN Method = 'mpesa' AND IsCashSubstitution = 1 THEN Amount ELSE 0 END) AS SubstitutionAmount
         FROM dbo.Payment
         WHERE WaiterId IS NOT NULL
         GROUP BY WaiterId
       ), d AS (
         SELECT WaiterId, SUM(Amount) AS DropAmount
         FROM dbo.CashDrop
         GROUP BY WaiterId
       )
       SELECT COALESCE(p.WaiterId, d.WaiterId) AS WaiterId,
              COALESCE(p.MpesaAmount, 0) AS MpesaAmount,
              COALESCE(p.CashAmount, 0) AS CashAmount,
              COALESCE(p.SubstitutionAmount, 0) AS SubstitutionAmount,
              COALESCE(d.DropAmount, 0) AS DropAmount
       FROM p FULL OUTER JOIN d ON d.WaiterId = p.WaiterId`
    );
    const balances: WaiterCashBalance[] = result.recordset.map((row) => {
      const expectedDrop = row.CashAmount + row.SubstitutionAmount;
      return {
        waiterId: String(row.WaiterId),
        mpesaAmount: row.MpesaAmount,
        cashAmount: row.CashAmount,
        substitutionAmount: row.SubstitutionAmount,
        expectedDrop,
        dropAmount: row.DropAmount,
        pending: Math.max(0, expectedDrop - row.DropAmount),
      };
    });
    return jsonWithEtag(request, balances);
  } catch (err) {
    console.error("GET /api/cash-drops/balances failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load cash balances", detail: message }, { status: 500 });
  }
}
