"use client";

import { useEffect, useRef, useState } from "react";
import { ChefHat, X } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { useOpenOrders } from "@/lib/hooks/useOrders";

interface Toast {
  id: string;
  ticketId: string;
  displayNumber: number;
}

const AUTO_DISMISS_MS = 12000;

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
// the last sent item ready, and raises an in-app toast (plus a chime) right
// then — nothing to click through to see it, since this mounts app-wide in
// AppShell and polls via the same useOpenOrders() already driving the rest
// of the order-taking UI.
export function OrderReadyNotifier() {
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const { tickets, orders } = useOpenOrders();
  const [toasts, setToasts] = useState<Toast[]>([]);
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
      setToasts((prev) => [
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

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), AUTO_DISMISS_MS)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-3 rounded-2xl bg-status-free text-white shadow-lg px-4 py-3"
        >
          <ChefHat size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-sm">Order #{t.displayNumber} is ready</div>
            <div className="text-xs font-semibold opacity-90">
              The kitchen has it ready for pickup.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
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
