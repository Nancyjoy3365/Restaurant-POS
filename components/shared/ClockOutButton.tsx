"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePosStore } from "@/lib/store";
import { clockOut as clockOutApi } from "@/lib/api/staff";
import { cancelEmptyTickets } from "@/lib/hooks/useOrders";

// Shared by the desktop sidebar and the mobile order screen (which has no
// other way to reach it, since it takes over the whole screen) — same
// confirm-before-clocking-out flow either way.
export function ClockOutButton({
  className,
  children,
  "aria-label": ariaLabel,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
  title?: string;
}) {
  const router = useRouter();
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const logout = usePosStore((s) => s.logout);
  const [open, setOpen] = useState(false);

  function confirm(shouldClockOut: boolean) {
    // Fired without waiting — logout shouldn't stall on the network, and
    // neither the shift record nor the empty-ticket sweep are needed for
    // the navigation that follows.
    if (shouldClockOut && currentStaffId) {
      clockOutApi(currentStaffId).catch((err) => console.error("Clock-out failed:", err));
    }
    cancelEmptyTickets().catch((err) => console.error("Empty-ticket cleanup failed:", err));
    setOpen(false);
    logout();
    router.push("/login");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-label={ariaLabel}
        title={title}
      >
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-extrabold text-slate-900 mb-1">
              Clock out for the day?
            </h3>
            <p className="text-xs text-slate-500 font-semibold mb-4">
              Choose &ldquo;No&rdquo; if you&rsquo;re just switching users
              briefly and still on shift.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => confirm(false)}
                className="rounded-xl border-2 border-warm-200 text-slate-600 hover:border-slate-300 hover:bg-warm-50 font-extrabold py-3 transition-colors"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => confirm(true)}
                className="rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-extrabold py-3 transition-colors"
              >
                Yes, clock out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
