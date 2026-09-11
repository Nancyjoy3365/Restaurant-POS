import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import type { Ticket } from "@/lib/types";

type OrderRow = {
  OrderId: number;
  DisplayNumber: number;
  WaiterId: number;
  LocationNote: string | null;
  OrderType: Ticket["orderType"];
  CustomerName: string | null;
  CustomerPhone: string | null;
  Status: Ticket["status"];
  OpenedAt: Date;
  ClosedAt: Date | null;
};

// Flat ticket list across every status/date, with none of the nested
// round/line-item data — for report-style pages (Performance) that need
// historical paid tickets, not the live order-taking board (see
// GET /api/orders for that, scoped to open tickets only).
export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query<OrderRow>("SELECT * FROM dbo.[Order] ORDER BY OpenedAt DESC");
    const tickets: Ticket[] = result.recordset.map((row) => ({
      id: String(row.OrderId),
      displayNumber: row.DisplayNumber,
      waiterId: String(row.WaiterId),
      locationNote: row.LocationNote ?? undefined,
      orderType: row.OrderType,
      customerName: row.CustomerName ?? undefined,
      customerPhone: row.CustomerPhone ?? undefined,
      status: row.Status,
      openedAt: row.OpenedAt.getTime(),
      closedAt: row.ClosedAt ? row.ClosedAt.getTime() : undefined,
    }));
    return NextResponse.json(tickets);
  } catch (err) {
    console.error("GET /api/tickets failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load tickets", detail: message }, { status: 500 });
  }
}
