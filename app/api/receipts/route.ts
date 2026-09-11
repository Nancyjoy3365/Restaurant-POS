import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import type { Receipt, ReceiptLineItem, ReceiptPaymentLine } from "@/lib/types";

type ReceiptRow = {
  ReceiptId: number;
  InvoiceNumber: string;
  OrderId: number;
  OrderLabel: string;
  LocationNote: string | null;
  Subtotal: number;
  Vat: number;
  Total: number;
  QrDataUrl: string | null;
  IssuedAt: Date;
};
type ReceiptLineItemRow = {
  ReceiptId: number;
  MenuItemId: number;
  Name: string;
  Qty: number;
  Price: number;
  LineTotal: number;
  RoundIndex: number;
};
type ReceiptPaymentLineRow = {
  ReceiptId: number;
  Method: ReceiptPaymentLine["method"];
  Amount: number;
  Reference: string;
  CustomerName: string | null;
};

export async function GET() {
  try {
    const pool = await getPool();
    const [receipts, lineItems, paymentLines] = await Promise.all([
      pool.request().query<ReceiptRow>("SELECT * FROM dbo.Receipt ORDER BY IssuedAt DESC"),
      pool.request().query<ReceiptLineItemRow>("SELECT * FROM dbo.ReceiptLineItem"),
      pool.request().query<ReceiptPaymentLineRow>("SELECT * FROM dbo.ReceiptPaymentLine"),
    ]);

    const lineItemsByReceipt = new Map<number, ReceiptLineItem[]>();
    for (const row of lineItems.recordset) {
      const list = lineItemsByReceipt.get(row.ReceiptId) ?? [];
      list.push({
        menuItemId: String(row.MenuItemId),
        name: row.Name,
        qty: row.Qty,
        price: row.Price,
        lineTotal: row.LineTotal,
        roundIndex: row.RoundIndex,
      });
      lineItemsByReceipt.set(row.ReceiptId, list);
    }

    const paymentLinesByReceipt = new Map<number, ReceiptPaymentLine[]>();
    for (const row of paymentLines.recordset) {
      const list = paymentLinesByReceipt.get(row.ReceiptId) ?? [];
      list.push({
        method: row.Method,
        amount: row.Amount,
        reference: row.Reference,
        customerName: row.CustomerName ?? undefined,
      });
      paymentLinesByReceipt.set(row.ReceiptId, list);
    }

    const result: Receipt[] = receipts.recordset.map((row) => ({
      id: String(row.ReceiptId),
      invoiceNumber: row.InvoiceNumber,
      ticketId: String(row.OrderId),
      ticketLabel: row.OrderLabel,
      locationNote: row.LocationNote ?? undefined,
      items: lineItemsByReceipt.get(row.ReceiptId) ?? [],
      subtotal: row.Subtotal,
      vat: row.Vat,
      total: row.Total,
      payments: paymentLinesByReceipt.get(row.ReceiptId) ?? [],
      qrDataUrl: row.QrDataUrl ?? "",
      issuedAt: row.IssuedAt.getTime(),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/receipts failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load receipts", detail: message }, { status: 500 });
  }
}
