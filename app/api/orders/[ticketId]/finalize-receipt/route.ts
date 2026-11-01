import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { fetchTicketAndOrder } from "@/lib/server/orders";
import { simulateEtimsSigning } from "@/lib/mock-integrations";
import type { Receipt, ReceiptLineItem, ReceiptPaymentLine } from "@/lib/types";

// Mirrors finalizeReceipt in lib/store.ts: usp_FinalizeReceipt snapshots the
// unbilled rounds/payments into a Receipt (QrDataUrl still NULL), then the
// (simulated) eTIMS signing call runs, then usp_SetReceiptQrCode saves the
// result — genuinely three sequential steps, the middle one external/slow,
// so this can't collapse into a single stored procedure round trip.
export async function POST(_request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  try {
    const pool = await getPool();
    const orderDetailResult = await pool
      .request()
      .input("OrderId", sql.Int, Number(ticketId))
      .query<{
        OrderDetailId: number;
        BilledThroughRoundIndex: number;
        RoundCount: number;
        LatestReceiptId: number | null;
        LatestQrDataUrl: string | null;
        LatestInvoiceNumber: string | null;
      }>(
        `SELECT od.OrderDetailId, od.BilledThroughRoundIndex,
                (SELECT COUNT(*) FROM dbo.[Round] r WHERE r.OrderDetailId = od.OrderDetailId) AS RoundCount,
                lr.ReceiptId AS LatestReceiptId, lr.QrDataUrl AS LatestQrDataUrl, lr.InvoiceNumber AS LatestInvoiceNumber
         FROM dbo.OrderDetail od
         OUTER APPLY (
           SELECT TOP 1 ReceiptId, QrDataUrl, InvoiceNumber FROM dbo.Receipt
           WHERE OrderId = od.OrderId
             AND EXISTS (SELECT 1 FROM dbo.ReceiptLineItem li WHERE li.ReceiptId = dbo.Receipt.ReceiptId)
           ORDER BY IssuedAt DESC
         ) lr
         WHERE od.OrderId = @OrderId`
      );
    const orderDetail = orderDetailResult.recordset[0];
    if (!orderDetail) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    const orderDetailId = orderDetail.OrderDetailId;

    // Every round is already billed, so finalizing again would only snapshot
    // an empty receipt carrying the previous total (the cashier's cash-drop
    // auto-complete can re-fire on an order it already finished) — hand back
    // the existing receipt instead.
    const alreadyBilled =
      orderDetail.BilledThroughRoundIndex >= orderDetail.RoundCount &&
      orderDetail.LatestReceiptId !== null;

    let receiptId: number;
    let invoiceNumber: string;
    if (alreadyBilled) {
      receiptId = orderDetail.LatestReceiptId!;
      invoiceNumber = orderDetail.LatestInvoiceNumber!;
    } else {
      const finalizeResult = await pool
        .request()
        .input("OrderDetailId", sql.Int, orderDetailId)
        .input("QrDataUrl", sql.NVarChar(sql.MAX), null)
        .output("ReceiptId", sql.Int)
        .output("InvoiceNumber", sql.NVarChar(50))
        .execute("usp_FinalizeReceipt");
      receiptId = finalizeResult.output.ReceiptId as number;
      invoiceNumber = finalizeResult.output.InvoiceNumber as string;
    }

    const [receiptRow, lineItemRows, paymentLineRows] = await Promise.all([
      pool
        .request()
        .input("ReceiptId", sql.Int, receiptId)
        .query<{
          OrderId: number;
          OrderLabel: string;
          LocationNote: string | null;
          Subtotal: number;
          Vat: number;
          Total: number;
          IssuedAt: Date;
        }>("SELECT OrderId, OrderLabel, LocationNote, Subtotal, Vat, Total, IssuedAt FROM dbo.Receipt WHERE ReceiptId = @ReceiptId"),
      pool
        .request()
        .input("ReceiptId", sql.Int, receiptId)
        .query<{ MenuItemId: number; Name: string; Qty: number; Price: number; LineTotal: number; RoundIndex: number }>(
          "SELECT MenuItemId, Name, Qty, Price, LineTotal, RoundIndex FROM dbo.ReceiptLineItem WHERE ReceiptId = @ReceiptId"
        ),
      pool
        .request()
        .input("ReceiptId", sql.Int, receiptId)
        .query<{ Method: ReceiptPaymentLine["method"]; Amount: number; Reference: string; CustomerName: string | null }>(
          "SELECT Method, Amount, Reference, CustomerName FROM dbo.ReceiptPaymentLine WHERE ReceiptId = @ReceiptId"
        ),
    ]);
    const receiptRowData = receiptRow.recordset[0];

    let qrDataUrl = alreadyBilled ? orderDetail.LatestQrDataUrl : null;
    if (!qrDataUrl) {
      const invoiceRef = paymentLineRows.recordset.map((p) => p.Reference).join(", ") || "N/A";
      ({ qrDataUrl } = await simulateEtimsSigning({
        invoiceNumber,
        invoiceRef,
        total: receiptRowData.Total,
      }));

      await pool
        .request()
        .input("ReceiptId", sql.Int, receiptId)
        .input("QrDataUrl", sql.NVarChar(sql.MAX), qrDataUrl)
        .execute("usp_SetReceiptQrCode");
    }

    const items: ReceiptLineItem[] = lineItemRows.recordset.map((row) => ({
      menuItemId: String(row.MenuItemId),
      name: row.Name,
      qty: row.Qty,
      price: row.Price,
      lineTotal: row.LineTotal,
      roundIndex: row.RoundIndex,
    }));
    const payments: ReceiptPaymentLine[] = paymentLineRows.recordset.map((row) => ({
      method: row.Method,
      amount: row.Amount,
      reference: row.Reference,
      customerName: row.CustomerName ?? undefined,
    }));
    const receipt: Receipt = {
      id: String(receiptId),
      invoiceNumber,
      ticketId: String(receiptRowData.OrderId),
      ticketLabel: receiptRowData.OrderLabel,
      locationNote: receiptRowData.LocationNote ?? undefined,
      items,
      subtotal: receiptRowData.Subtotal,
      vat: receiptRowData.Vat,
      total: receiptRowData.Total,
      payments,
      qrDataUrl,
      issuedAt: receiptRowData.IssuedAt.getTime(),
    };

    const updatedOrder = await fetchTicketAndOrder(pool, Number(ticketId));
    return NextResponse.json({ receipt, ...updatedOrder });
  } catch (err) {
    console.error(`POST /api/orders/${ticketId}/finalize-receipt failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to finalize receipt", detail: message }, { status: 500 });
  }
}
