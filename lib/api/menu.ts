import type { MenuItem } from "@/lib/types";
import { request, ApiError } from "./client";

export { ApiError };

export const fetchMenu = () => request<MenuItem[]>("/api/menu");

export const createMenuItem = (item: Omit<MenuItem, "id">) =>
  request<MenuItem>("/api/menu", { method: "POST", body: JSON.stringify(item) });

export const updateMenuItem = (menuItemId: string, updates: Omit<MenuItem, "id">) =>
  request<{ ok: true }>(`/api/menu/${menuItemId}`, { method: "PATCH", body: JSON.stringify(updates) });

export const setMenuItemAvailable = (menuItemId: string, available: boolean) =>
  request<{ ok: true }>(`/api/menu/${menuItemId}/availability`, {
    method: "POST",
    body: JSON.stringify({ available }),
  });

export const setMenuItemPriority = (menuItemId: string, isPriority: boolean) =>
  request<{ ok: true }>(`/api/menu/${menuItemId}/priority`, {
    method: "POST",
    body: JSON.stringify({ isPriority }),
  });
