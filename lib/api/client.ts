import { usePosStore } from "@/lib/store";

// Thrown for both network failures and non-2xx API responses so every
// caller can show `err.message` directly — it's already the server's own
// error text (including business-rule messages) when available.
export class ApiError extends Error {}

// The server no longer recognises this device's session (it expired, or
// it was never logged in under the new server-checked login) — clear the
// local login and send the user back to pick themselves and enter the PIN.
function handleSessionEnded() {
  usePosStore.getState().logout();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload on purpose, to drop every cached response from the ended session
    window.location.assign("/login");
  }
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    // A wrong PIN on the login screen is also a 401, but that's just a
    // failed attempt, not an ended session.
    if (res.status === 401 && !url.startsWith("/api/auth/login")) handleSessionEnded();
    throw new ApiError(body?.error ?? `Request to ${url} failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
