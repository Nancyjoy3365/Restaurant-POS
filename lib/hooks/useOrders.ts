import useSWR, { mutate } from "swr";
import * as ordersApi from "@/lib/api/orders";
import type { TicketAndOrder } from "@/lib/api/orders";
import { optimisticAddItem, optimisticRemoveItem, optimisticUpdateItemQty } from "@/lib/orderOptimistic";
import { SHARED_SWR_CONFIG } from "./swrConfig";
import type { AddOn, MenuItem } from "@/lib/types";

// Order-taking is the highest-frequency interaction in the app (every tap
// while building a ticket), so it polls faster than the other DB-backed
// slices (Vendors/Menu/Staff use 5s) and the hottest mutations (addItem,
// updateItemQty, removeItem) update the local cache optimistically via
// lib/orderOptimistic.ts instead of waiting on a round trip.
const POLL_CONFIG = { refreshInterval: 3000, revalidateOnFocus: true };

const OPEN_ORDERS_KEY = "/api/orders";
const orderKey = (ticketId: string) => `/api/orders/${ticketId}`;

export function useOpenOrders() {
  const { data, error, isLoading, mutate } = useSWR(OPEN_ORDERS_KEY, ordersApi.fetchOpenOrders, POLL_CONFIG);
  return { tickets: data?.tickets ?? [], orders: data?.orders ?? {}, isLoading, error, mutate };
}

export function useOrder(ticketId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR(
    ticketId ? orderKey(ticketId) : null,
    () => ordersApi.fetchOrder(ticketId as string),
    POLL_CONFIG
  );
  return { ticket: data?.ticket, order: data?.order, isLoading, error, mutate };
}

// Historical, any-status tickets for report-style pages (Performance) —
// not part of the live order-taking poll cadence.
export function useAllTickets() {
  const { data, error, isLoading } = useSWR("/api/tickets", ordersApi.fetchAllTickets, SHARED_SWR_CONFIG);
  return { tickets: data ?? [], isLoading, error };
}

// Every mutation below updates the shared SWR cache directly (via the
// module-level `mutate`, not a hook-bound one) so it's usable from anywhere
// — a specific ticket's detail view, or a list screen like Kitchen/My
// Tickets acting on many tickets at once — without needing a `useOrder`
// instance per ticket.
async function afterTicketMutation(result: TicketAndOrder) {
  mutate(OPEN_ORDERS_KEY);
  mutate(orderKey(result.ticket.id), result, { revalidate: false });
}

export const createTicket = ordersApi.createTicket;
export const cancelEmptyTickets = ordersApi.cancelEmptyTickets;

export async function addItem(
  ticketId: string,
  roundId: string,
  menuItem: MenuItem,
  opts: { spiceLevel?: string; addOns?: AddOn[] },
  vatRate: number
) {
  const result = await mutate(orderKey(ticketId), ordersApi.addItem(ticketId, roundId, menuItem, opts), {
    optimisticData: ((current: TicketAndOrder | undefined) =>
      current
        ? { ticket: current.ticket, order: optimisticAddItem(current.order, roundId, menuItem, opts, vatRate) }
        : current) as (current: TicketAndOrder | undefined) => TicketAndOrder,
    rollbackOnError: true,
    populateCache: true,
    revalidate: false,
  });
  mutate(OPEN_ORDERS_KEY);
  return result;
}

export async function updateItemQty(ticketId: string, itemId: string, qty: number, vatRate: number) {
  const result = await mutate(orderKey(ticketId), ordersApi.updateItemQty(itemId, qty), {
    optimisticData: ((current: TicketAndOrder | undefined) =>
      current
        ? { ticket: current.ticket, order: optimisticUpdateItemQty(current.order, itemId, qty, vatRate) }
        : current) as (current: TicketAndOrder | undefined) => TicketAndOrder,
    rollbackOnError: true,
    populateCache: true,
    revalidate: false,
  });
  mutate(OPEN_ORDERS_KEY);
  return result;
}

export async function removeItem(ticketId: string, itemId: string, vatRate: number) {
  const result = await mutate(orderKey(ticketId), ordersApi.removeItem(itemId), {
    optimisticData: ((current: TicketAndOrder | undefined) =>
      current
        ? { ticket: current.ticket, order: optimisticRemoveItem(current.order, itemId, vatRate) }
        : current) as (current: TicketAndOrder | undefined) => TicketAndOrder,
    rollbackOnError: true,
    populateCache: true,
    revalidate: false,
  });
  mutate(OPEN_ORDERS_KEY);
  return result;
}

export async function addRound(ticketId: string) {
  const result = await ordersApi.addRound(ticketId);
  await afterTicketMutation(result);
  return result;
}

export async function holdOrder(ticketId: string) {
  const result = await ordersApi.holdOrder(ticketId);
  await afterTicketMutation(result);
  return result;
}

export async function resumeOrder(ticketId: string) {
  const result = await ordersApi.resumeOrder(ticketId);
  await afterTicketMutation(result);
  return result;
}

export async function markAllItemsReady(ticketId: string) {
  const result = await ordersApi.markAllItemsReady(ticketId);
  await afterTicketMutation(result);
  return result;
}

export async function sendRoundToKitchen(roundId: string) {
  const result = await ordersApi.sendRoundToKitchen(roundId);
  await afterTicketMutation(result);
  return result;
}

export async function updateItemNote(itemId: string, note: string) {
  const result = await ordersApi.updateItemNote(itemId, note);
  await afterTicketMutation(result);
  return result;
}

export async function voidItem(itemId: string, reason: string, staffId?: string) {
  const result = await ordersApi.voidItem(itemId, reason, staffId);
  await afterTicketMutation(result);
  return result;
}

export async function toggleItemReady(itemId: string, ready: boolean) {
  const result = await ordersApi.toggleItemReady(itemId, ready);
  await afterTicketMutation(result);
  return result;
}
