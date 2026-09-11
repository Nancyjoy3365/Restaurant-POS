// This app has no push channel (websockets/SSE) — every DB-backed slice
// (Vendors/Inventory, Menu, Staff) relies on a short poll plus
// revalidate-on-focus so a change made on one device reaches every other
// device without a manual refresh. 5s keeps things feeling live without
// hammering the DB; bump this later if it's ever too chatty.
export const SHARED_SWR_CONFIG = { refreshInterval: 5000, revalidateOnFocus: true };
