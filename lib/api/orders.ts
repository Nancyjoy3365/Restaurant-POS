import type { AddOn, MenuItem, OrderType, Ticket, TicketOrder } from "@/lib/types";
import { request, ApiError } from "./client";

export { ApiError };

export interface TicketAndOrder {
  ticket: Ticket;
  order: TicketOrder;
}

export interface OrdersAndTickets {
  tickets: Ticket[];
  orders: Record<string, TicketOrder>;
}

export const fetchOpenOrders = () => request<OrdersAndTickets>("/api/orders");

export const fetchOrder = (ticketId: string) => request<TicketAndOrder>(`/api/orders/${ticketId}`);

// Flat, any-status ticket list (no nested rounds/items) for report-style
// pages that need historical paid tickets — see app/api/tickets/route.ts.
export const fetchAllTickets = () => request<Ticket[]>("/api/tickets");

export const createTicket = (fields: {
  waiterId: string;
  locationNote?: string;
  orderType?: OrderType;
  customerName?: string;
  customerPhone?: string;
}) => request<TicketAndOrder>("/api/orders", { method: "POST", body: JSON.stringify(fields) });

export const addItem = (
  ticketId: string,
  roundId: string,
  menuItem: MenuItem,
  opts: { spiceLevel?: string; addOns?: AddOn[] }
) =>
  request<TicketAndOrder>(`/api/orders/${ticketId}/items`, {
    method: "POST",
    body: JSON.stringify({ roundId, menuItem, spiceLevel: opts.spiceLevel, addOns: opts.addOns }),
  });

export const addRound = (ticketId: string) =>
  request<TicketAndOrder>(`/api/orders/${ticketId}/rounds`, { method: "POST" });

export const holdOrder = (ticketId: string) => request<TicketAndOrder>(`/api/orders/${ticketId}/hold`, { method: "POST" });

export const resumeOrder = (ticketId: string) =>
  request<TicketAndOrder>(`/api/orders/${ticketId}/resume`, { method: "POST" });

export const markAllItemsReady = (ticketId: string) =>
  request<TicketAndOrder>(`/api/orders/${ticketId}/ready-all`, { method: "POST" });

export const cancelEmptyTickets = () => request<{ ok: true }>("/api/orders/cancel-empty", { method: "POST" });

export const sendRoundToKitchen = (roundId: string) =>
  request<TicketAndOrder>(`/api/rounds/${roundId}/send`, { method: "POST" });

export const updateItemQty = (itemId: string, qty: number) =>
  request<TicketAndOrder>(`/api/order-line-items/${itemId}`, { method: "PATCH", body: JSON.stringify({ qty }) });

export const removeItem = (itemId: string) =>
  request<TicketAndOrder>(`/api/order-line-items/${itemId}`, { method: "DELETE" });

export const updateItemNote = (itemId: string, note: string) =>
  request<TicketAndOrder>(`/api/order-line-items/${itemId}/note`, {
    method: "PATCH",
    body: JSON.stringify({ note }),
  });

export const voidItem = (itemId: string, reason: string, staffId?: string) =>
  request<TicketAndOrder>(`/api/order-line-items/${itemId}/void`, {
    method: "POST",
    body: JSON.stringify({ reason, staffId }),
  });

export const toggleItemReady = (itemId: string, ready: boolean) =>
  request<TicketAndOrder>(`/api/order-line-items/${itemId}/ready`, {
    method: "POST",
    body: JSON.stringify({ ready }),
  });
