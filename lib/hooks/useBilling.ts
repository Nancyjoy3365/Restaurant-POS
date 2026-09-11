import useSWR from "swr";
import { fetchCashDrops, fetchPayments, fetchReceipts, fetchRestaurantSettings } from "@/lib/api/billing";
import { VAT_RATE } from "@/lib/utils";
import { SHARED_SWR_CONFIG } from "./swrConfig";

export function usePayments() {
  const { data, error, isLoading, mutate } = useSWR("/api/payments", fetchPayments, SHARED_SWR_CONFIG);
  return { payments: data ?? [], error, isLoading, mutate };
}

export function useReceipts() {
  const { data, error, isLoading, mutate } = useSWR("/api/receipts", fetchReceipts, SHARED_SWR_CONFIG);
  return { receipts: data ?? [], error, isLoading, mutate };
}

export function useCashDrops() {
  const { data, error, isLoading, mutate } = useSWR("/api/cash-drops", fetchCashDrops, SHARED_SWR_CONFIG);
  return { cashDrops: data ?? [], error, isLoading, mutate };
}

// Hot-path (read on every order-screen render for the live VAT calculation)
// but edited rarely — polls like everything else, with VAT_RATE as a
// sensible fallback for the brief moment before the first fetch resolves.
export function useRestaurantSettings() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/restaurant-settings",
    fetchRestaurantSettings,
    SHARED_SWR_CONFIG
  );
  return { settings: data, vatRate: data?.vatRate ?? VAT_RATE, error, isLoading, mutate };
}
