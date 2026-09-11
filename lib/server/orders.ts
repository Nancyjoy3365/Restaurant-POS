import type { ConnectionPool, Request as SqlRequest } from "mssql";
import { sql } from "@/lib/db";
import type { AddOn, OrderLineItem, Round, Ticket, TicketOrder } from "@/lib/types";

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

type OrderDetailRow = {
  OrderDetailId: number;
  OrderId: number;
  WaiterId: number | null;
  PaymentStatus: TicketOrder["paymentStatus"];
  Subtotal: number | null;
  Vat: number | null;
  Total: number | null;
  OnHold: boolean;
  BilledThroughRoundIndex: number;
};

type RoundRow = { RoundId: number; OrderDetailId: number; RoundIndex: number; CreatedAt: Date; SentAt: Date | null };
type LineItemRow = {
  OrderLineItemId: number;
  RoundId: number;
  MenuItemId: number;
  Name: string;
  Price: number;
  Qty: number;
  IsVeg: boolean;
  ComboTag: string | null;
  SpiceLevel: string | null;
  Note: string | null;
  SentToKitchen: boolean;
  KitchenReady: boolean;
};
type AddOnRow = { OrderLineItemAddOnId: number; OrderLineItemId: number; Name: string; Price: number };

export interface OrdersAndTickets {
  tickets: Ticket[];
  orders: Record<string, TicketOrder>;
}

// Shared assembly for both the open-tickets list and a single ticket detail
// fetch — `orderFilterSql` scopes every query (via joins, not an id array)
// so this never pulls the whole historical order table, only what's in
// scope. `newRequest` builds a fresh parameterized request per query (a
// `mssql` Request can only be executed once).
async function assemble(
  pool: ConnectionPool,
  orderFilterSql: string,
  newRequest: () => SqlRequest
): Promise<OrdersAndTickets> {
  const [orders, orderDetails, rounds, lineItems, addOns] = await Promise.all([
    newRequest().query<OrderRow>(`SELECT * FROM dbo.[Order] o WHERE ${orderFilterSql}`),
    newRequest().query<OrderDetailRow>(
      `SELECT od.* FROM dbo.OrderDetail od INNER JOIN dbo.[Order] o ON o.OrderId = od.OrderId WHERE ${orderFilterSql}`
    ),
    newRequest().query<RoundRow>(
      `SELECT r.* FROM dbo.[Round] r
       INNER JOIN dbo.OrderDetail od ON od.OrderDetailId = r.OrderDetailId
       INNER JOIN dbo.[Order] o ON o.OrderId = od.OrderId
       WHERE ${orderFilterSql}
       ORDER BY r.OrderDetailId, r.RoundIndex`
    ),
    newRequest().query<LineItemRow>(
      `SELECT oli.* FROM dbo.OrderLineItem oli
       INNER JOIN dbo.[Round] r ON r.RoundId = oli.RoundId
       INNER JOIN dbo.OrderDetail od ON od.OrderDetailId = r.OrderDetailId
       INNER JOIN dbo.[Order] o ON o.OrderId = od.OrderId
       WHERE ${orderFilterSql}`
    ),
    newRequest().query<AddOnRow>(
      `SELECT ao.* FROM dbo.OrderLineItemAddOn ao
       INNER JOIN dbo.OrderLineItem oli ON oli.OrderLineItemId = ao.OrderLineItemId
       INNER JOIN dbo.[Round] r ON r.RoundId = oli.RoundId
       INNER JOIN dbo.OrderDetail od ON od.OrderDetailId = r.OrderDetailId
       INNER JOIN dbo.[Order] o ON o.OrderId = od.OrderId
       WHERE ${orderFilterSql}`
    ),
  ]);

  const addOnsByLineItem = new Map<number, AddOn[]>();
  for (const row of addOns.recordset) {
    const list = addOnsByLineItem.get(row.OrderLineItemId) ?? [];
    list.push({ name: row.Name, price: row.Price });
    addOnsByLineItem.set(row.OrderLineItemId, list);
  }

  const lineItemsByRound = new Map<number, OrderLineItem[]>();
  for (const row of lineItems.recordset) {
    const list = lineItemsByRound.get(row.RoundId) ?? [];
    list.push({
      id: String(row.OrderLineItemId),
      menuItemId: String(row.MenuItemId),
      name: row.Name,
      price: row.Price,
      qty: row.Qty,
      veg: row.IsVeg,
      comboTag: row.ComboTag ?? undefined,
      spiceLevel: row.SpiceLevel ?? undefined,
      addOns: addOnsByLineItem.get(row.OrderLineItemId) ?? [],
      note: row.Note ?? undefined,
      sentToKitchen: row.SentToKitchen || undefined,
      kitchenReady: row.KitchenReady || undefined,
    });
    lineItemsByRound.set(row.RoundId, list);
  }

  const roundsByOrderDetail = new Map<number, Round[]>();
  for (const row of rounds.recordset) {
    const list = roundsByOrderDetail.get(row.OrderDetailId) ?? [];
    list.push({
      id: String(row.RoundId),
      index: row.RoundIndex,
      createdAt: row.CreatedAt.getTime(),
      sentAt: row.SentAt ? row.SentAt.getTime() : undefined,
      items: lineItemsByRound.get(row.RoundId) ?? [],
    });
    roundsByOrderDetail.set(row.OrderDetailId, list);
  }

  const ordersByOrderId = new Map<number, TicketOrder>();
  for (const row of orderDetails.recordset) {
    ordersByOrderId.set(row.OrderId, {
      id: String(row.OrderDetailId),
      ticketId: String(row.OrderId),
      waiterId: row.WaiterId ? String(row.WaiterId) : undefined,
      rounds: roundsByOrderDetail.get(row.OrderDetailId) ?? [],
      paymentStatus: row.PaymentStatus,
      billTotals:
        row.Subtotal !== null && row.Vat !== null && row.Total !== null
          ? { subtotal: row.Subtotal, vat: row.Vat, total: row.Total }
          : undefined,
      onHold: row.OnHold || undefined,
      billedThroughRoundIndex: row.BilledThroughRoundIndex || undefined,
    });
  }

  const tickets: Ticket[] = [];
  const ordersResult: Record<string, TicketOrder> = {};
  for (const row of orders.recordset) {
    tickets.push({
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
    });
    const order = ordersByOrderId.get(row.OrderId);
    if (order) ordersResult[String(row.OrderId)] = order;
  }

  return { tickets, orders: ordersResult };
}

export const fetchOpenTicketsAndOrders = (pool: ConnectionPool) =>
  assemble(pool, "o.Status = 'open'", () => pool.request());

export async function fetchTicketAndOrder(
  pool: ConnectionPool,
  orderId: number
): Promise<{ ticket: Ticket; order: TicketOrder } | null> {
  const { tickets, orders } = await assemble(pool, "o.OrderId = @OrderId", () =>
    pool.request().input("OrderId", sql.Int, orderId)
  );
  const ticket = tickets[0];
  if (!ticket) return null;
  return { ticket, order: orders[ticket.id] };
}

export async function fetchVatRate(pool: ConnectionPool): Promise<number> {
  const result = await pool.request().query<{ VatRate: number }>("SELECT VatRate FROM dbo.RestaurantSettings WHERE SettingsId = 1");
  return result.recordset[0]?.VatRate ?? 0.16;
}

// Resolves the OrderDetail/Order that own a given line item — routes
// mutating a line item by id (qty/remove/void/note/ready) fetch this FIRST,
// before any delete, since the item may not exist anymore afterward.
export async function fetchLineItemContext(
  pool: ConnectionPool,
  orderLineItemId: number
): Promise<{ orderDetailId: number; orderId: number } | null> {
  const result = await pool
    .request()
    .input("OrderLineItemId", sql.Int, orderLineItemId)
    .query<{ OrderDetailId: number; OrderId: number }>(
      `SELECT od.OrderDetailId, od.OrderId FROM dbo.[Round] r
       INNER JOIN dbo.OrderDetail od ON od.OrderDetailId = r.OrderDetailId
       INNER JOIN dbo.OrderLineItem oli ON oli.RoundId = r.RoundId
       WHERE oli.OrderLineItemId = @OrderLineItemId`
    );
  const row = result.recordset[0];
  return row ? { orderDetailId: row.OrderDetailId, orderId: row.OrderId } : null;
}

// A no-op server-side if billing hasn't started yet for this cycle — see
// usp_RefreshOrderDetailTotals.
export async function refreshOrderDetailTotals(pool: ConnectionPool, orderDetailId: number): Promise<void> {
  const vatRate = await fetchVatRate(pool);
  await pool
    .request()
    .input("OrderDetailId", sql.Int, orderDetailId)
    .input("VatRate", sql.Decimal(5, 4), vatRate)
    .execute("usp_RefreshOrderDetailTotals");
}
