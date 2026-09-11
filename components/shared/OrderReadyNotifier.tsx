"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChefHat, X } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { useOpenOrders } from "@/lib/hooks/useOrders";

interface Notice {
  id: string;
  ticketId: string;
  displayNumber: number;
}

// A short two-note chime via the Web Audio API — no audio asset to ship,
// and it still works the first time without waiting on a network fetch.
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const notes = [880, 1175];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    // Autoplay can be blocked before the user has interacted with the page
    // at all — the visual toast below still gets the message across.
  }
}

// Watches every waiter's own open tickets for the moment the kitchen marks
// the last sent item ready, and raises an in-app notification (plus a
// chime) right then — nothing to click through to see it, since this
// mounts app-wide in AppShell and polls via the same useOpenOrders()
// already driving the rest of the order-taking UI. A notification stays on
// screen until the waiter actually dismisses it (Seen or the X) — it never
// times out on its own, since a missed chime shouldn't mean a missed pickup.
export function OrderReadyNotifier() {
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const { tickets, orders } = useOpenOrders();
  const [notices, setNotices] = useState<Notice[]>([]);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!currentStaffId) return;
    const stillReady = new Set<string>();
    for (const ticket of tickets) {
      if (ticket.status !== "open" || ticket.waiterId !== currentStaffId) continue;
      const order = orders[ticket.id];
      if (!order) continue;
      const sentItems = order.rounds.flatMap((r) => r.items).filter((i) => i.sentToKitchen);
      const allReady = sentItems.length > 0 && sentItems.every((i) => i.kitchenReady);
      if (!allReady) continue;
      stillReady.add(ticket.id);
      if (notifiedRef.current.has(ticket.id)) continue;
      notifiedRef.current.add(ticket.id);
      playChime();
      setNotices((prev) => [
        ...prev,
        { id: `${ticket.id}-${Date.now()}`, ticketId: ticket.id, displayNumber: ticket.displayNumber },
      ]);
    }
    // A ticket that's no longer all-ready (e.g. a fresh round was just sent)
    // can raise the alert again next time it clears — forget it now.
    for (const id of notifiedRef.current) {
      if (!stillReady.has(id)) notifiedRef.current.delete(id);
    }
  }, [tickets, orders, currentStaffId]);

  function dismiss(id: string) {
    setNotices((prev) => prev.filter((x) => x.id !== id));
  }

  if (notices.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      {notices.map((n) => (
        <div
          key={n.id}
          className="flex items-start gap-3 rounded-2xl bg-status-free text-white shadow-lg px-4 py-3"
        >
          <ChefHat size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-sm">Order #{n.displayNumber} is ready</div>
            <div className="text-xs font-semibold opacity-90">
              The kitchen has it ready for pickup.
            </div>
            <button
              type="button"
              onClick={() => dismiss(n.id)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 hover:bg-white/30 text-xs font-extrabold px-3 py-1.5"
            >
              <Check size={13} strokeWidth={3} /> Seen
            </button>
          </div>
          <button
            type="button"
            onClick={() => dismiss(n.id)}
            aria-label="Dismiss"
            className="shrink-0 rounded-full p-1 hover:bg-white/20"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
