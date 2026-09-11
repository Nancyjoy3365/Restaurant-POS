import type { Recipe, ServiceExpense } from "@/lib/types";
import { request, ApiError } from "./client";

export { ApiError };

export const fetchServiceExpenses = () => request<ServiceExpense[]>("/api/service-expenses");

export const createServiceExpense = (expense: Omit<ServiceExpense, "id">) =>
  request<ServiceExpense>("/api/service-expenses", { method: "POST", body: JSON.stringify(expense) });

export const updateServiceExpense = (expenseId: string, updates: Omit<ServiceExpense, "id">) =>
  request<{ ok: true }>(`/api/service-expenses/${expenseId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

export const deleteServiceExpense = (expenseId: string) =>
  request<{ ok: true }>(`/api/service-expenses/${expenseId}`, { method: "DELETE" });

export const fetchRecipes = () => request<Recipe[]>("/api/recipes");
