// Thrown for both network failures and non-2xx API responses so every
// caller can show `err.message` directly — it's already the server's own
// error text (including business-rule messages) when available.
export class ApiError extends Error {}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error ?? `Request to ${url} failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
