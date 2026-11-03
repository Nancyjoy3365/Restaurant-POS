import { request } from "./client";
import type { StaffRole } from "@/lib/types";
import type { StaffDirectoryEntry } from "@/app/api/auth/staff-directory/route";

export type { StaffDirectoryEntry };

export const fetchStaffDirectory = () => request<StaffDirectoryEntry[]>("/api/auth/staff-directory");

// The server checks the PIN and, if it's right, sets the session cookie.
// `mustSetPin`: they got in with the old shared PIN and have to choose
// their own (setOwnPin) before the app will let them do anything else.
export const login = (staffId: string, pin: string) =>
  request<{ staffId: string; name: string; role: StaffRole; mustSetPin: boolean }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ staffId, pin }),
  });

export const setOwnPin = (newPin: string) =>
  request<{ ok: true }>("/api/auth/set-pin", { method: "POST", body: JSON.stringify({ newPin }) });

export const logout = () => request<{ ok: true }>("/api/auth/logout", { method: "POST" });
