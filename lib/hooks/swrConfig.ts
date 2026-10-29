// This app has no push channel (websockets/SSE) — every DB-backed slice
// relies on a poll plus revalidate-on-focus so a change made on one device
// reaches every other device without a manual refresh. Every write path
// already calls mutate() on its own device, so these intervals only bound
// how stale *other* devices can get; keep them long — each poll is a billed
// Vercel Function invocation, multiplied by N devices × M endpoints. Orders
// poll faster (see useOrders.ts).
export const SHARED_SWR_CONFIG = { refreshInterval: 30000, revalidateOnFocus: true };

// Reference data edited rarely and only from back-office screens (vendors,
// ingredients, staff, settings…) — no poll at all; revalidate-on-focus
// picks up another device's edit the next time this window is used.
export const STATIC_SWR_CONFIG = { refreshInterval: 0, revalidateOnFocus: true };

// Menu carries item availability, so other tablets should stop offering an
// unavailable item reasonably quickly — but a minute is fine in practice.
export const MENU_SWR_CONFIG = { refreshInterval: 60000, revalidateOnFocus: true };

// Payments, receipts and cash drops feed live shift/cash totals, so a
// payment taken at one station should show up at another fairly quickly.
export const BILLING_SWR_CONFIG = { refreshInterval: 30000, revalidateOnFocus: true };
