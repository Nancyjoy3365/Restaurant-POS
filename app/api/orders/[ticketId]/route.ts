import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { fetchTicketAndOrder } from "@/lib/server/orders";
import { jsonWithEtag } from "@/lib/server/etag";

export async function GET(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  try {
    const pool = await getPool();
    const result = await fetchTicketAndOrder(pool, Number(ticketId));
    if (!result) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    return jsonWithEtag(request, result);
  } catch (err) {
    console.error(`GET /api/orders/${ticketId} failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load ticket", detail: message }, { status: 500 });
  }
}
