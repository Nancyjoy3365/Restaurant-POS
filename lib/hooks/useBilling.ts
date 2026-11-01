import useSWR from "swr";
import { fetchCashDrops, fetchPayments, fetchReceipts, fetchRestaurantSettings } from "@/lib/api/billing";
import { VAT_RATE } from "@/lib/utils";
import { BILLING_SWR_CONFIG, STATIC_SWR_CONFIG } from "./swrConfig";

export function usePayments() {
  const { data, error, isLoading, mutate } = useSWR("/api/payments", fetchPayments, BILLING_SWR_CONFIG);
  return { payments: data ?? [], error, isLoading, mutate };
}

// Receipts are only ever needed for a date range on screen (reports), so
// fetch just that range rather than the whole receipt history on every poll.
export function useReceipts(range: { start: Date; end: Date }) {
  const key = `/api/receipts?from=${range.start.getTime()}&to=${range.end.getTime()}`;
  const { data, error, isLoading, mutate } = useSWR(key, fetchReceipts, BILLING_SWR_CONFIG);
  return { receipts: data ?? [], error, isLoading, mutate };
}

export function useCashDrops() {
  const { data, error, isLoading, mutate } = useSWR("/api/cash-drops", fetchCashDrops, BILLING_SWR_CONFIG);
  return { cashDrops: data ?? [], error, isLoading, mutate };
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
