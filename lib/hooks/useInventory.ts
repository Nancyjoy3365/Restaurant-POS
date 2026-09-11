import useSWR from "swr";
import {
  fetchIngredients,
  fetchStockPurchases,
  fetchUnitsOfMeasure,
  fetchVendorPayments,
  fetchVendors,
} from "@/lib/api/inventory";
import { fetchRecipes, fetchServiceExpenses } from "@/lib/api/inventoryExtras";
import { SHARED_SWR_CONFIG as SHARED_CONFIG } from "./swrConfig";

export function useVendors() {
  const { data, error, isLoading, mutate } = useSWR("/api/vendors", fetchVendors, SHARED_CONFIG);
  return { vendors: data ?? [], error, isLoading, mutate };
}

export function useIngredients() {
  const { data, error, isLoading, mutate } = useSWR("/api/ingredients", fetchIngredients, SHARED_CONFIG);
  return { ingredients: data ?? [], error, isLoading, mutate };
}

export function useUnitsOfMeasure() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/units-of-measure",
    fetchUnitsOfMeasure,
    SHARED_CONFIG
  );
  return { unitsOfMeasure: data ?? [], error, isLoading, mutate };
}

export function useStockPurchases() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/stock-purchases",
    fetchStockPurchases,
    SHARED_CONFIG
  );
  return { stockPurchases: data ?? [], error, isLoading, mutate };
}

export function useVendorPayments() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/vendor-payments",
    fetchVendorPayments,
    SHARED_CONFIG
  );
  return { vendorPayments: data ?? [], error, isLoading, mutate };
}

export function useServiceExpenses() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/service-expenses",
    fetchServiceExpenses,
    SHARED_CONFIG
  );
  return { serviceExpenses: data ?? [], error, isLoading, mutate };
}

// Recipe has no write path yet (see lib/api/inventoryExtras.ts) — always
// empty in practice today, kept for lib/reports.ts's COGS calculation.
export function useRecipes() {
  const { data, error, isLoading } = useSWR("/api/recipes", fetchRecipes, SHARED_CONFIG);
  return { recipes: data ?? [], error, isLoading };
}
