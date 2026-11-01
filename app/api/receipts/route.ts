import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import type { Receipt, ReceiptLineItem, ReceiptPaymentLine } from "@/lib/types";
import { jsonWithEtag } from "@/lib/server/etag";

type ReceiptRow = {
  ReceiptId: number;
  InvoiceNumber: string;
  OrderId: number;
  OrderLabel: string;
  LocationNote: string | null;
  Subtotal: number;
  Vat: number;
  Total: number;
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

export async function GET(request: Request) {
  try {
    const pool = await getPool();
    // Optional ?from=&to= (epoch ms) — report pages ask only for the range on
    // screen instead of the whole receipt history on every poll.
    const { searchParams } = new URL(request.url);
    const from = Number(searchParams.get("from"));
    const to = Number(searchParams.get("to"));
    const ranged = Number.isFinite(from) && Number.isFinite(to) && from > 0 && to > 0;
    const rangeFilter = ranged ? "AND r.IssuedAt >= @From AND r.IssuedAt <= @To" : "";
    const withRange = () => {
      const req = pool.request();
      if (ranged) {
        req.input("From", sql.DateTime2, new Date(from));
        req.input("To", sql.DateTime2, new Date(to));
      }
      return req;
    };

    const [receipts, lineItems, paymentLines] = await Promise.all([
      // A receipt with no line items is a duplicate from re-finalizing an
      // already-billed order (see finalize-receipt) — it repeats the real
      // receipt's total with nothing sold or paid behind it, so it's left out
      // rather than double-counting revenue. QrDataUrl is left out on purpose:
      // it's a base64 image per receipt (tens of MB across all of them) that
      // no list screen shows — the printed receipt gets its QR from the
      // finalize-receipt response instead.
      withRange().query<ReceiptRow>(
        `SELECT r.ReceiptId, r.InvoiceNumber, r.OrderId, r.OrderLabel, r.LocationNote,
                r.Subtotal, r.Vat, r.Total, r.IssuedAt
         FROM dbo.Receipt r
         WHERE EXISTS (SELECT 1 FROM dbo.ReceiptLineItem li WHERE li.ReceiptId = r.ReceiptId)
         ${rangeFilter}
         ORDER BY r.IssuedAt DESC`
      ),
      withRange().query<ReceiptLineItemRow>(
        `SELECT li.ReceiptId, li.MenuItemId, li.Name, li.Qty, li.Price, li.LineTotal, li.RoundIndex
         FROM dbo.ReceiptLineItem li JOIN dbo.Receipt r ON r.ReceiptId = li.ReceiptId
         WHERE 1 = 1 ${rangeFilter}`
      ),
      withRange().query<ReceiptPaymentLineRow>(
        `SELECT p.ReceiptId, p.Method, p.Amount, p.Reference, p.CustomerName
         FROM dbo.ReceiptPaymentLine p JOIN dbo.Receipt r ON r.ReceiptId = p.ReceiptId
         WHERE 1 = 1 ${rangeFilter}`
      ),
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
      qrDataUrl: "",
      issuedAt: row.IssuedAt.getTime(),
    }));

    return jsonWithEtag(request, result);
  } catch (err) {
    console.error("GET /api/receipts failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load receipts", detail: message }, { status: 500 });
  }
}
