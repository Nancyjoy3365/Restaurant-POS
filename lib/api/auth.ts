import { request } from "./client";
import type { StaffRole } from "@/lib/types";
import type { StaffDirectoryEntry } from "@/app/api/auth/staff-directory/route";

export type { StaffDirectoryEntry };

export const fetchStaffDirectory = () => request<StaffDirectoryEntry[]>("/api/auth/staff-directory");

// The server checks the PIN and, if it's right, sets the session cookie.
export const login = (staffId: string, pin: string) =>
  request<{ staffId: string; name: string; role: StaffRole }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ staffId, pin }),
  });

export const logout = () => request<{ ok: true }>("/api/auth/logout", { method: "POST" });
