import useSWR from "swr";
import {
  fetchCashDrops,
  fetchPayments,
  fetchPaymentsByUrl,
  fetchTicketPayments,
  fetchReceipts,
  fetchRestaurantSettings,
  fetchWaiterCashBalances,
} from "@/lib/api/billing";
import { VAT_RATE } from "@/lib/utils";
import { BILLING_SWR_CONFIG, STATIC_SWR_CONFIG } from "./swrConfig";

export function usePayments() {
  const { data, error, isLoading, mutate } = useSWR("/api/payments", fetchPayments, BILLING_SWR_CONFIG);
  return { payments: data ?? [], error, isLoading, mutate };
}

// Payments for a single ticket — used by the billing screen, which only
// ever needs this ticket's payments, not the full history.
export function useTicketPayments(ticketId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR(
    ticketId ? `/api/payments?ticketId=${ticketId}` : null,
    () => fetchTicketPayments(ticketId!),
    BILLING_SWR_CONFIG
  );
  return { payments: data ?? [], error, isLoading, mutate };
}

// Receipts are only ever needed for a date range on screen (reports), so
// fetch just that range rather than the whole receipt history on every poll.
export function useReceipts(range: { start: Date; end: Date }) {
  const key = `/api/receipts?from=${range.start.getTime()}&to=${range.end.getTime()}`;
  const { data, error, isLoading, mutate } = useSWR(key, fetchReceipts, BILLING_SWR_CONFIG);
  return { receipts: data ?? [], error, isLoading, mutate };
}

// The cashier's live queue: payments on still-open tickets only.
export function useOpenTicketPayments() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/payments?scope=open",
    fetchPaymentsByUrl,
    BILLING_SWR_CONFIG
  );
  return { payments: data ?? [], error, isLoading, mutate };
}

// Payments within [start, end) — keepPreviousData so changing the date
// range doesn't flash empty tables while the new range loads.
export function usePaymentsInRange(range: { start: number; end: number }) {
  const key = `/api/payments?from=${range.start}&to=${range.end}`;
  const { data, error, isLoading, mutate } = useSWR(key, fetchPaymentsByUrl, {
    ...BILLING_SWR_CONFIG,
    keepPreviousData: true,
  });
  return { payments: data ?? [], error, isLoading, mutate };
}

// Completed-ticket search by M-Pesa code / customer name. Only runs while
// there's a query, and isn't polled — it's a one-off lookup.
export function usePaymentSearch(query: string) {
  const q = query.trim();
  const { data, error, isLoading } = useSWR(
    q ? `/api/payments?search=${encodeURIComponent(q)}` : null,
    fetchPaymentsByUrl,
    { ...STATIC_SWR_CONFIG, keepPreviousData: true }
  );
  return { payments: q ? data ?? [] : [], error, isLoading };
}

export function useCashDrops(range: { start: number; end: number }) {
  const key = `/api/cash-drops?from=${range.start}&to=${range.end}`;
  const { data, error, isLoading, mutate } = useSWR(key, fetchCashDrops, {
    ...BILLING_SWR_CONFIG,
    keepPreviousData: true,
  });
  return { cashDrops: data ?? [], error, isLoading, mutate };
}

// All-time pending cash per staff member, summed on the server.
export function useWaiterCashBalances() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/cash-drops/balances",
    fetchWaiterCashBalances,
    BILLING_SWR_CONFIG
  );
  return { balances: data ?? [], error, isLoading, mutate };
}

// Hot-path (read on every order-screen render for the live VAT calculation)
// but edited rarely — no poll (focus revalidation only), with VAT_RATE as a
// sensible fallback for the brief moment before the first fetch resolves.
export function useRestaurantSettings() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/restaurant-settings",
    fetchRestaurantSettings,
    STATIC_SWR_CONFIG
  );
  return { settings: data, vatRate: data?.vatRate ?? VAT_RATE, error, isLoading, mutate };
}
