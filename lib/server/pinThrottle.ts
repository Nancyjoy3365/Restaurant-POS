// A 3-digit PIN has only 1,000 possibilities, so wrong guesses are capped
// per client address. Kept in memory: Vercel reuses a warm instance across
// many requests, which is enough to stop someone simply trying every PIN,
// though a determined attacker spread across cold instances could get a few
// more tries than the limit.
const MAX_FAILURES = 5;
const WINDOW_MS = 5 * 60 * 1000;

const failures = new Map<string, { count: number; firstAt: number }>();

export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

// Minutes left before this client may try again, or 0 if it isn't blocked.
export function blockedForMinutes(key: string): number {
  const entry = failures.get(key);
  if (!entry) return 0;
  const elapsed = Date.now() - entry.firstAt;
  if (elapsed > WINDOW_MS) {
    failures.delete(key);
    return 0;
  }
  return entry.count >= MAX_FAILURES ? Math.ceil((WINDOW_MS - elapsed) / 60000) : 0;
}

export function recordFailure(key: string) {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.firstAt > WINDOW_MS) {
    failures.set(key, { count: 1, firstAt: Date.now() });
  } else {
    entry.count += 1;
  }
}

export function clearFailures(key: string) {
  failures.delete(key);
}
