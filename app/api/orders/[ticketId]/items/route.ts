import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { fetchTicketAndOrder, fetchVatRate } from "@/lib/server/orders";
import type { AddOn } from "@/lib/types";

function addOnKey(addOns: AddOn[]): string {
  return addOns
    .map((a) => a.name)
    .sort()
    .join("|");
}

// Mirrors addItem in lib/store.ts: merges into an already-present identical
// line (same menu item + spice level + add-on set) in the target round, or
// starts a fresh round first if that round is already covered by a
// finalized receipt — see the comment on OrderDetail.BilledThroughRoundIndex
// in database/01_schema.sql.
export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const body = await request.json();
  const { roundId, menuItem, spiceLevel, addOns } = body;

  if (!roundId || !menuItem?.id) {
    return NextResponse.json({ error: "roundId and menuItem are required" }, { status: 400 });
  }
  const addOnsList: AddOn[] = addOns ?? [];

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    const orderDetailResult = await transaction
      .request()
      .input("OrderId", sql.Int, Number(ticketId))
      .query<{ OrderDetailId: number; BilledThroughRoundIndex: number }>(
        "SELECT OrderDetailId, BilledThroughRoundIndex FROM dbo.OrderDetail WHERE OrderId = @OrderId"
      );
    const orderDetail = orderDetailResult.recordset[0];
    if (!orderDetail) throw new Error("Order not found");
    const { OrderDetailId: orderDetailId, BilledThroughRoundIndex: billedThrough } = orderDetail;

    const targetRoundResult = await transaction
      .request()
      .input("RoundId", sql.Int, Number(roundId))
      .query<{ RoundIndex: number }>("SELECT RoundIndex FROM dbo.[Round] WHERE RoundId = @RoundId");
    const targetRoundIndex = targetRoundResult.recordset[0]?.RoundIndex;
    const needsNewRound = targetRoundIndex === undefined || targetRoundIndex <= billedThrough;

    let actualRoundId = Number(roundId);
    if (needsNewRound) {
      const nextIndexResult = await transaction
        .request()
        .input("OrderDetailId", sql.Int, orderDetailId)
        .query<{ NextIndex: number }>(
          "SELECT ISNULL(MAX(RoundIndex), 0) + 1 AS NextIndex FROM dbo.[Round] WHERE OrderDetailId = @OrderDetailId"
        );
      const nextIndex = nextIndexResult.recordset[0].NextIndex;
      const roundInsert = await transaction
        .request()
        .input("OrderDetailId", sql.Int, orderDetailId)
        .input("RoundIndex", sql.Int, nextIndex)
        .query<{ RoundId: number }>(
          "INSERT INTO dbo.[Round] (OrderDetailId, RoundIndex, CreatedAt) OUTPUT INSERTED.RoundId VALUES (@OrderDetailId, @RoundIndex, SYSUTCDATETIME())"
        );
      actualRoundId = roundInsert.recordset[0].RoundId;
    }

    let matchedLineItemId: number | null = null;
    if (!needsNewRound) {
      const candidates = await transaction
        .request()
        .input("RoundId", sql.Int, actualRoundId)
        .input("MenuItemId", sql.Int, Number(menuItem.id))
        .input("SpiceLevel", sql.NVarChar(50), spiceLevel ?? null)
        .query<{ OrderLineItemId: number }>(
          `SELECT OrderLineItemId FROM dbo.OrderLineItem
           WHERE RoundId = @RoundId AND MenuItemId = @MenuItemId
             AND ((SpiceLevel IS NULL AND @SpiceLevel IS NULL) OR SpiceLevel = @SpiceLevel)`
        );

      for (const candidate of candidates.recordset) {
        const candidateAddOns = await transaction
          .request()
          .input("OrderLineItemId", sql.Int, candidate.OrderLineItemId)
          .query<{ Name: string }>("SELECT Name FROM dbo.OrderLineItemAddOn WHERE OrderLineItemId = @OrderLineItemId");
        const candidateKey = addOnKey(candidateAddOns.recordset.map((a) => ({ name: a.Name, price: 0 })));
        if (candidateKey === addOnKey(addOnsList)) {
          matchedLineItemId = candidate.OrderLineItemId;
          break;
        }
      }
    }

    if (matchedLineItemId) {
      await transaction
        .request()
        .input("OrderLineItemId", sql.Int, matchedLineItemId)
        .input("QtyDelta", sql.Decimal(8, 2), 1)
        .execute("usp_IncrementOrderLineItemQty");
    } else {
      await transaction
        .request()
        .input("RoundId", sql.Int, actualRoundId)
        .input("MenuItemId", sql.Int, Number(menuItem.id))
        .input("Name", sql.NVarChar(150), menuItem.name)
        .input("Price", sql.Decimal(12, 2), menuItem.price)
        .input("Qty", sql.Decimal(8, 2), 1)
        .input("IsVeg", sql.Bit, Boolean(menuItem.veg))
        .input("ComboTag", sql.NVarChar(100), menuItem.comboTag ?? null)
        .input("SpiceLevel", sql.NVarChar(50), spiceLevel ?? null)
        .input("Note", sql.NVarChar(500), null)
        .input("AddOnsJson", sql.NVarChar(sql.MAX), addOnsList.length ? JSON.stringify(addOnsList) : null)
        .output("OrderLineItemId", sql.Int)
        .execute("usp_AddOrderLineItem");
    }

    const vatRate = await fetchVatRate(pool);
    await transaction
      .request()
      .input("OrderDetailId", sql.Int, orderDetailId)
      .input("VatRate", sql.Decimal(5, 4), vatRate)
      .execute("usp_RefreshOrderDetailTotals");

    await transaction.request().input("OrderDetailId", sql.Int, orderDetailId).execute("usp_ResetOrderPaymentStatusIfPaid");

    await transaction.commit();

    const updated = await fetchTicketAndOrder(pool, Number(ticketId));
    return NextResponse.json(updated);
  } catch (err) {
    await transaction.rollback().catch(() => {});
    console.error(`POST /api/orders/${ticketId}/items failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to add item", detail: message }, { status: 500 });
  }
}
