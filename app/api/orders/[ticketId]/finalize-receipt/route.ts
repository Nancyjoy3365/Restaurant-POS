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
      .query<{ OrderDetailId: number }>("SELECT OrderDetailId FROM dbo.OrderDetail WHERE OrderId = @OrderId");
    const orderDetailId = orderDetailResult.recordset[0]?.OrderDetailId;
    if (!orderDetailId) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const finalizeResult = await pool
      .request()
      .input("OrderDetailId", sql.Int, orderDetailId)
      .input("QrDataUrl", sql.NVarChar(sql.MAX), null)
      .output("ReceiptId", sql.Int)
      .output("InvoiceNumber", sql.NVarChar(50))
      .execute("usp_FinalizeReceipt");
    const receiptId = finalizeResult.output.ReceiptId as number;
    const invoiceNumber = finalizeResult.output.InvoiceNumber as string;

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

    const invoiceRef = paymentLineRows.recordset.map((p) => p.Reference).join(", ") || "N/A";
    const { qrDataUrl } = await simulateEtimsSigning({
      invoiceNumber,
      invoiceRef,
      total: receiptRowData.Total,
    });

    await pool
      .request()
      .input("ReceiptId", sql.Int, receiptId)
      .input("QrDataUrl", sql.NVarChar(sql.MAX), qrDataUrl)
      .execute("usp_SetReceiptQrCode");

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
