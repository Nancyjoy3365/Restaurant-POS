import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { fetchTicketAndOrder } from "@/lib/server/orders";
import { sessionFromRequest } from "@/lib/server/session";

export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const body = await request.json();
  const { method, amount, reference, customerName, isCashSubstitution } = body;
  // Who took the payment is whoever is logged in on this device — taken from
  // the server session, not from anything the browser sends.
  const collectedByStaffId = sessionFromRequest(request)?.staffId;

  if (!method || !amount) {
    return NextResponse.json({ error: "method and amount are required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    const orderDetailResult = await pool
      .request()
      .input("OrderId", sql.Int, Number(ticketId))
      .query<{ OrderDetailId: number; Total: number; RecordedForCycle: number; UnbilledRounds: number }>(
        `SELECT od.OrderDetailId, ISNULL(od.Total, 0) AS Total,
                (SELECT ISNULL(SUM(p.Amount), 0) FROM dbo.Payment p
                 WHERE p.OrderDetailId = od.OrderDetailId
                   AND p.BillingCycle = od.BilledThroughRoundIndex + 1) AS RecordedForCycle,
                (SELECT COUNT(*) FROM dbo.[Round] r
                 WHERE r.OrderDetailId = od.OrderDetailId
                   AND r.RoundIndex > od.BilledThroughRoundIndex) AS UnbilledRounds
         FROM dbo.OrderDetail od WHERE od.OrderId = @OrderId`
      );
    const orderDetail = orderDetailResult.recordset[0];
    if (!orderDetail) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    const orderDetailId = orderDetail.OrderDetailId;

    // Once the whole bill is already recorded (an M-Pesa payment without a
    // code still counts — it's only awaiting the cashier's verification), or
    // every round has already been receipted, another payment can only be a
    // repeat tap, so refuse it rather than charging the customer twice.
    const alreadyCovered =
      orderDetail.UnbilledRounds === 0 ||
      (orderDetail.Total > 0 && orderDetail.RecordedForCycle >= orderDetail.Total);
    if (alreadyCovered) {
      return NextResponse.json(
        { error: "The full bill is already recorded for this order — no further payment is needed." },
        { status: 409 }
      );
    }

    await pool
      .request()
      .input("OrderDetailId", sql.Int, orderDetailId)
      .input("OrderId", sql.Int, Number(ticketId))
      .input("Method", sql.NVarChar(10), method)
      .input("Amount", sql.Decimal(12, 2), amount)
      .input("Reference", sql.NVarChar(100), reference ?? "")
      .input("CustomerName", sql.NVarChar(150), customerName ?? null)
      .input("IsCashSubstitution", sql.Bit, method === "mpesa" ? Boolean(isCashSubstitution) : null)
      .input("CollectedByStaffId", sql.Int, collectedByStaffId ? Number(collectedByStaffId) : null)
      .output("PaymentId", sql.Int)
      .output("NewPaymentStatus", sql.NVarChar(20))
      .execute("usp_RecordPayment");

    const updated = await fetchTicketAndOrder(pool, Number(ticketId));
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`POST /api/orders/${ticketId}/payments failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to record payment", detail: message }, { status: 500 });
  }
}
