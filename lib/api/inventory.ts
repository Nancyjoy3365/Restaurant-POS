import type { Ingredient, StockPurchase, UnitOfMeasure, Vendor, VendorPayment, VendorPaymentMethod } from "@/lib/types";
import { request, ApiError } from "./client";

export { ApiError };

export const fetchVendors = () => request<Vendor[]>("/api/vendors");

export const createVendor = (fields: Omit<Vendor, "id" | "active">) =>
  request<Vendor>("/api/vendors", { method: "POST", body: JSON.stringify(fields) });

export const updateVendor = (vendorId: string, fields: Omit<Vendor, "id">) =>
  request<{ ok: true }>(`/api/vendors/${vendorId}`, { method: "PATCH", body: JSON.stringify(fields) });

export const setVendorActive = (vendorId: string, active: boolean) =>
  request<{ ok: true }>(`/api/vendors/${vendorId}/active`, {
    method: "POST",
    body: JSON.stringify({ active }),
  });

export const fetchIngredients = () => request<Ingredient[]>("/api/ingredients");

export const createIngredient = (
  fields: Omit<Ingredient, "id">,
  initialPurchase?: { vendorId: string }
) =>
  request<Ingredient>("/api/ingredients", {
    method: "POST",
    body: JSON.stringify({ ...fields, initialPurchase }),
  });

export const updateIngredient = (ingredientId: string, fields: Omit<Ingredient, "id">) =>
  request<{ ok: true }>(`/api/ingredients/${ingredientId}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });

export const fetchUnitsOfMeasure = () => request<UnitOfMeasure[]>("/api/units-of-measure");

export const addUnitOfMeasure = (label: string) =>
  request<UnitOfMeasure>("/api/units-of-measure", { method: "POST", body: JSON.stringify({ label }) });

export const fetchStockPurchases = () => request<StockPurchase[]>("/api/stock-purchases");

export const recordStockPurchase = (purchase: {
  vendorId: string;
  ingredientId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}) => request<StockPurchase>("/api/stock-purchases", { method: "POST", body: JSON.stringify(purchase) });

export const fetchVendorPayments = () => request<VendorPayment[]>("/api/vendor-payments");

export const recordVendorPayout = (
  vendorId: string,
  amount: number,
  method: VendorPaymentMethod,
  reference?: string
) =>
  request<VendorPayment>("/api/vendor-payments", {
    method: "POST",
    body: JSON.stringify({ vendorId, amount, method, reference }),
  });
