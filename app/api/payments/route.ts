import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import type { Payment } from "@/lib/types";
import { jsonWithEtag } from "@/lib/server/etag";

type PaymentRow = {
  PaymentId: number;
  OrderDetailId: number;
  OrderId: number;
  WaiterId: number | null;
  CollectedByStaffId: number | null;
  Method: Payment["method"];
  Amount: number;
  Reference: string;
  CustomerName: string | null;
  IsCashSubstitution: boolean | null;
  BillingCycle: number;
  PaidAt: Date;
};

export function toPayment(row: PaymentRow): Payment {
  return {
    id: String(row.PaymentId),
    orderId: String(row.OrderDetailId),
    ticketId: String(row.OrderId),
    waiterId: row.WaiterId ? String(row.WaiterId) : undefined,
    collectedByStaffId: row.CollectedByStaffId ? String(row.CollectedByStaffId) : undefined,
    method: row.Method,
    amount: row.Amount,
    reference: row.Reference,
    customerName: row.CustomerName ?? undefined,
    isCashSubstitution: row.IsCashSubstitution ?? undefined,
    billingCycle: row.BillingCycle,
    paidAt: row.PaidAt.getTime(),
  };
}

export async function GET(request: Request) {
  try {
    const pool = await getPool();
    const { searchParams } = new URL(request.url);

    // ?scope=open — payments on tickets still open. The cashier's live queue
    // only ever looks at these, not the whole history.
    if (searchParams.get("scope") === "open") {
      const result = await pool.request().query<PaymentRow>(
        `SELECT p.* FROM dbo.Payment p
         JOIN dbo.[Order] o ON o.OrderId = p.OrderId
         WHERE o.Status = 'open'
         ORDER BY p.PaidAt DESC`
      );
      return jsonWithEtag(request, result.recordset.map(toPayment));
    }

    // ?search= — paid-and-closed tickets' payments matching an M-Pesa code or
    // customer name (the cashier's "find a completed order" search). Capped
    // to the newest 100 so a one-letter search can't pull the whole table.
    const search = searchParams.get("search")?.trim();
    if (search) {
      // Wrap LIKE wildcards in brackets so a typed % or _ matches literally.
      const pattern = `%${search.replace(/[[%_]/g, (c) => `[${c}]`)}%`;
      const result = await pool
        .request()
        .input("Pattern", sql.NVarChar(200), pattern)
        .query<PaymentRow>(
          `SELECT TOP 100 p.* FROM dbo.Payment p
           JOIN dbo.[Order] o ON o.OrderId = p.OrderId
           WHERE o.Status = 'paid'
             AND (p.Reference LIKE @Pattern OR p.CustomerName LIKE @Pattern)
           ORDER BY p.PaidAt DESC`
        );
      return jsonWithEtag(request, result.recordset.map(toPayment));
    }

    // ?from=&to= (epoch ms, to exclusive) — payments in a date range, for
    // the cashier's reconciliation view.
    const from = Number(searchParams.get("from"));
    const to = Number(searchParams.get("to"));
    if (Number.isFinite(from) && Number.isFinite(to) && from > 0 && to > 0) {
      const result = await pool
        .request()
        .input("From", sql.DateTime2, new Date(from))
        .input("To", sql.DateTime2, new Date(to))
        .query<PaymentRow>(
          "SELECT * FROM dbo.Payment WHERE PaidAt >= @From AND PaidAt < @To ORDER BY PaidAt DESC"
        );
      return jsonWithEtag(request, result.recordset.map(toPayment));
    }

    // ?ticketId= narrows to one ticket (indexed on OrderId) so the billing
    // page doesn't download the whole payment history on every poll.
    const ticketIdParam = searchParams.get("ticketId");
    if (ticketIdParam !== null) {
      const ticketId = Number(ticketIdParam);
      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return NextResponse.json({ error: "Invalid ticketId" }, { status: 400 });
      }
      const result = await pool
        .request()
        .input("ticketId", ticketId)
        .query<PaymentRow>("SELECT * FROM dbo.Payment WHERE OrderId = @ticketId ORDER BY PaidAt DESC");
      return jsonWithEtag(request, result.recordset.map(toPayment));
    }
    const result = await pool.request().query<PaymentRow>("SELECT * FROM dbo.Payment ORDER BY PaidAt DESC");
    return jsonWithEtag(request, result.recordset.map(toPayment));
  } catch (err) {
    console.error("GET /api/payments failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load payments", detail: message }, { status: 500 });
  }
}
