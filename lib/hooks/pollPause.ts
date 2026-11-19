import { useEffect } from "react";

// Lets a screen hold off background polling while the cashier is in the
// middle of taking a payment, so the app isn't competing with the card
// machine (PDQ) for the same shop Wi-Fi at the exact moment it matters.
//
// Wired into every SWR config through `isVisible` (see swrConfig.ts): SWR
// skips interval polls and focus refreshes when the page isn't "visible",
// but still runs explicit mutate() calls — so a screen's own refresh right
// after recording a payment goes through as normal.
//
// Each hold expires on its own after `maxMs`, so a payment form left
// half-filled can't freeze the app's data indefinitely.

const holds = new Map<symbol, number>(); // hold → expiry (epoch ms)

export function isPollingPaused(): boolean {
  if (holds.size === 0) return false;
  const now = Date.now();
  for (const [id, expiresAt] of holds) {
    if (expiresAt <= now) holds.delete(id);
  }
  return holds.size > 0;
}

export function usePausePolling(active: boolean, maxMs = 2 * 60 * 1000) {
  useEffect(() => {
    if (!active) return;
    const id = Symbol("poll-pause");
    holds.set(id, Date.now() + maxMs);
    return () => {
      holds.delete(id);
    };
  }, [active, maxMs]);
}

// Drop-in replacement for SWR's default `isVisible`: hidden tab OR a
// payment in progress both count as "don't poll right now".
export function isVisibleUnlessPaused(): boolean {
  const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
  return !hidden && !isPollingPaused();
}
