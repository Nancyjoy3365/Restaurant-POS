"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  ArrowLeft,
  ChevronDown,
  Minus,
  Plus,
  Trash2,
  StickyNote,
  PauseCircle,
  ChefHat,
  LayoutGrid,
  AlertCircle,
  X,
  Layers,
} from "lucide-react";
import {
  usePosStore,
  getOrderTotal,
  MAX_HELD_ORDERS_PER_WAITER,
} from "@/lib/store";
import { formatKES } from "@/lib/utils";
import { FoodImage } from "@/components/shared/FoodImage";
import { CategoryTabs } from "@/components/order/CategoryTabs";
import { SearchBar } from "@/components/order/SearchBar";
import { MenuCard } from "@/components/order/MenuCard";
import { GroupedMenuCard } from "@/components/order/GroupedMenuCard";
import { groupMenuItems } from "@/lib/menuGrouping";
import { ticketDetailSubtitle } from "@/components/tickets/ticketStatus";
import type { MenuCategory, OrderLineItem } from "@/lib/types";

const VOID_REASONS = ["Customer changed mind", "Kitchen error", "Other"];
const LONG_PRESS_MS = 500;

function createLongPressHandlers(onLongPress: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const start = () => {
    timer = setTimeout(onLongPress, LONG_PRESS_MS);
  };
  const clear = () => {
    if (timer) clearTimeout(timer);
  };
  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
  };
}

export function OrderScreenMobile({ ticketId }: { ticketId: string }) {
  const router = useRouter();

  const ticket = usePosStore((s) => s.tickets.find((t) => t.id === ticketId));
  const order = usePosStore((s) => s.orders[ticketId]);
  const menu = usePosStore((s) => s.menu);
  const staff = usePosStore((s) => s.staff);
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const currentStaff = staff.find((m) => m.id === currentStaffId);

  const addItem = usePosStore((s) => s.addItem);
  const updateItemQty = usePosStore((s) => s.updateItemQty);
  const voidItem = usePosStore((s) => s.voidItem);
  const updateItemNote = usePosStore((s) => s.updateItemNote);
  const addRound = usePosStore((s) => s.addRound);
  const startBilling = usePosStore((s) => s.startBilling);
  const sendRoundToKitchen = usePosStore((s) => s.sendRoundToKitchen);
  const heldOrderCountForWaiter = usePosStore((s) => s.heldOrderCountForWaiter);
  const vatRate = usePosStore((s) => s.restaurantSettings.vatRate);

  const rounds = useMemo(() => order?.rounds ?? [], [order]);
  const latestRoundId = rounds[rounds.length - 1]?.id;

  const [activeRoundId, setActiveRoundId] = useState<string | undefined>(
    latestRoundId
  );
  const [expandedRoundIds, setExpandedRoundIds] = useState<Set<string>>(
    () => new Set(latestRoundId ? [latestRoundId] : [])
  );
  const prevLatestRoundId = useRef(latestRoundId);

  useEffect(() => {
    if (latestRoundId && latestRoundId !== prevLatestRoundId.current) {
      setActiveRoundId(latestRoundId);
      setExpandedRoundIds(new Set([latestRoundId]));
      prevLatestRoundId.current = latestRoundId;
    }
  }, [latestRoundId]);

  const [holdBlocked, setHoldBlocked] = useState(false);
  const [voidTarget, setVoidTarget] = useState<OrderLineItem | null>(null);
  const [noteTarget, setNoteTarget] = useState<OrderLineItem | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<MenuCategory>("Main");
  const [pickerQuery, setPickerQuery] = useState("");

  const bottomBarRef = useRef<HTMLDivElement>(null);
  const [bottomBarHeight, setBottomBarHeight] = useState(0);

  useEffect(() => {
    const el = bottomBarRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setBottomBarHeight(entries[0].contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const itemCount = rounds.reduce(
    (sum, r) => sum + r.items.reduce((s2, i) => s2 + i.qty, 0),
    0
  );
  const { subtotal, vat, total } = getOrderTotal(order, vatRate);
  const isHeld = order?.onHold ?? false;
  const servingWaiter = order?.waiterId
    ? staff.find((m) => m.id === order.waiterId)
    : undefined;

  const pickerMatches = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return null;
    return menu.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.aliases.some((a) => a.toLowerCase().includes(q))
    );
  }, [pickerQuery, menu]);
  const pickerItems =
    pickerMatches ?? menu.filter((m) => m.category === pickerCategory);
  // As on the desktop grid, grouping only applies to the default browsing
  // view — an active search still jumps straight to the specific variant.
  const pickerGridEntries = pickerMatches
    ? pickerItems.map((item) => ({ kind: "single" as const, item }))
    : groupMenuItems(pickerItems);

  function selectRound(roundId: string) {
    setActiveRoundId(roundId);
    setExpandedRoundIds(new Set([roundId]));
  }

  function toggleRoundExpanded(roundId: string) {
    setExpandedRoundIds((prev) => {
      const next = new Set(prev);
      if (next.has(roundId)) next.delete(roundId);
      else next.add(roundId);
      return next;
    });
  }

  function handleSendToKitchen() {
    if (!activeRoundId) return;
    if (
      !isHeld &&
      heldOrderCountForWaiter(currentStaffId) >= MAX_HELD_ORDERS_PER_WAITER
    ) {
      setHoldBlocked(true);
      return;
    }
    setHoldBlocked(false);
    sendRoundToKitchen(ticketId, activeRoundId);
  }

  function handleBackToTickets() {
    router.push("/my-tickets");
  }

  function handleProceedToBill() {
    startBilling(ticketId);
    router.push(`/billing/${ticketId}`);
  }

  function openNoteEditor(item: OrderLineItem) {
    setNoteTarget(item);
    setNoteDraft(item.note ?? "");
  }

  function saveNote() {
    if (!noteTarget) return;
    updateItemNote(ticketId, noteTarget.id, noteDraft);
    setNoteTarget(null);
  }

  function confirmVoid(reason: string) {
    if (!voidTarget) return;
    voidItem(ticketId, voidTarget.id, reason);
    setVoidTarget(null);
  }

  if (!ticket) {
    return (
      <div className="fixed inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background lg:hidden">
        <p className="text-slate-500 font-bold">Order not found.</p>
        <button
          onClick={() => router.push("/my-tickets")}
          className="text-accent-600 font-extrabold"
        >
          Back to My Orders
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-10 flex flex-col bg-background lg:hidden">
      {/* Top bar */}
      <header className="shrink-0 border-b border-warm-200 bg-white">
        <div className="flex items-center gap-2 px-3 h-14">
          <button
            type="button"
            onClick={handleBackToTickets}
            aria-label="Back to My Orders"
            className="h-11 w-11 shrink-0 flex items-center justify-center rounded-full hover:bg-warm-50 text-slate-600"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-slate-900 truncate">
              Order No. {ticket.displayNumber} · {itemCount} item{itemCount === 1 ? "" : "s"}
            </div>
            {ticketDetailSubtitle(ticket) ? (
              <div className="text-[11px] font-bold text-slate-400 truncate">
                {ticketDetailSubtitle(ticket)}
              </div>
            ) : servingWaiter ? (
              <div className="text-[11px] font-bold text-slate-400 truncate">
                Opened by {servingWaiter.name}
              </div>
            ) : null}
          </div>
        </div>

        {isHeld && (
          <div className="px-3 pb-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-extrabold px-2.5 py-1">
              <PauseCircle size={12} /> On Hold — being processed
            </span>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto px-3 pb-3">
          {rounds.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => selectRound(r.id)}
              className={clsx(
                "shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition-colors",
                activeRoundId === r.id
                  ? "bg-slate-900 text-white"
                  : "bg-warm-50 text-slate-600 border border-warm-200"
              )}
            >
              Round {r.index}
            </button>
          ))}
          <button
            type="button"
            onClick={() => addRound(ticketId)}
            className="shrink-0 flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-extrabold border-2 border-dashed border-accent-300 text-accent-700"
          >
            <Layers size={13} /> Add Item
          </button>
        </div>
      </header>

      {/* Scrollable, round-grouped item list */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3"
        style={{ paddingBottom: bottomBarHeight + 80 }}
      >
        {itemCount === 0 ? (
          <p className="text-sm text-slate-400 font-semibold text-center py-10">
            No items yet — tap + to add from the menu.
          </p>
        ) : (
          rounds.map(
            (round) =>
              round.items.length > 0 && (
                <div
                  key={round.id}
                  className="border-b border-warm-200 last:border-0 pb-2 mb-2"
                >
                  <button
                    type="button"
                    onClick={() => toggleRoundExpanded(round.id)}
                    className="w-full flex items-center justify-between py-2"
                  >
                    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Round {round.index} —{" "}
                      {round.items.reduce((s2, i) => s2 + i.qty, 0)} items
                    </span>
                    <ChevronDown
                      size={16}
                      className={clsx(
                        "text-slate-400 transition-transform",
                        expandedRoundIds.has(round.id) && "rotate-180"
                      )}
                    />
                  </button>

                  {expandedRoundIds.has(round.id) && (
                    <div className="space-y-2 pb-1">
                      {round.items.map((item) => {
                        const addOnTotal = item.addOns.reduce(
                          (s2, a) => s2 + a.price,
                          0
                        );
                        const lineTotal = (item.price + addOnTotal) * item.qty;
                        const menuItem = menu.find(
                          (m) => m.id === item.menuItemId
                        );
                        const longPress = !item.note
                          ? createLongPressHandlers(() => openNoteEditor(item))
                          : {};
                        return (
                          <div
                            key={item.id}
                            className="flex gap-3 rounded-2xl bg-white border border-warm-200 shadow-sm p-3"
                          >
                            <div className="shrink-0" {...longPress}>
                              <FoodImage
                                imageUrl={menuItem?.imageUrl}
                                category={menuItem?.category ?? "Main"}
                                name={item.name}
                                className="h-14 w-14 rounded-xl"
                                emojiClassName="text-xl"
                              />
                            </div>
                            <div className="flex-1 min-w-0" {...longPress}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-extrabold text-sm text-slate-900 truncate">
                                    {item.name}
                                  </span>
                                  {item.note && (
                                    <button
                                      type="button"
                                      onClick={() => openNoteEditor(item)}
                                      aria-label="Edit note"
                                      className="shrink-0 text-amber-600 hover:text-amber-700"
                                    >
                                      <StickyNote size={14} />
                                    </button>
                                  )}
                                </div>
                                <span className="text-sm font-extrabold text-slate-900 whitespace-nowrap">
                                  {formatKES(lineTotal)}
                                </span>
                              </div>
                              {item.note && (
                                <p className="text-xs italic text-slate-500 mt-0.5 truncate">
                                  {item.note}
                                </p>
                              )}
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateItemQty(ticketId, item.id, item.qty - 1)
                                    }
                                    aria-label="Decrease quantity"
                                    className="h-11 w-11 flex items-center justify-center rounded-full bg-warm-50 border border-warm-200 text-slate-600 hover:border-accent-300"
                                  >
                                    <Minus size={15} />
                                  </button>
                                  <span className="text-sm font-extrabold w-5 text-center">
                                    {item.qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateItemQty(ticketId, item.id, item.qty + 1)
                                    }
                                    aria-label="Increase quantity"
                                    className="h-11 w-11 flex items-center justify-center rounded-full bg-warm-50 border border-warm-200 text-slate-600 hover:border-accent-300"
                                  >
                                    <Plus size={15} />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setVoidTarget(item)}
                                  aria-label="Delete item"
                                  className="h-11 w-11 flex items-center justify-center rounded-full text-rose-500 hover:bg-rose-50"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )
          )
        )}
      </div>

      {/* Floating add button */}
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        aria-label="Add item"
        style={{ bottom: bottomBarHeight + 16 }}
        className="fixed right-4 z-30 h-14 w-14 rounded-full bg-accent-600 hover:bg-accent-700 text-white shadow-lg flex items-center justify-center"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* Sticky bottom bar + nav strip */}
      <div ref={bottomBarRef} className="fixed inset-x-0 bottom-0 z-20">
        <div className="border-t border-warm-200 bg-white px-4 py-4 space-y-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <div className="flex justify-between text-sm font-semibold text-slate-600">
            <span>Subtotal</span>
            <span>{formatKES(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-slate-600">
            <span>VAT ({Math.round(vatRate * 100)}%)</span>
            <span>{formatKES(vat)}</span>
          </div>
          <div className="flex justify-between text-xl font-black text-slate-900 pt-1">
            <span>Total</span>
            <span>{formatKES(total)}</span>
          </div>

          {holdBlocked && (
            <div className="flex items-start gap-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold px-3 py-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              You already have {MAX_HELD_ORDERS_PER_WAITER} orders on hold.
              Proceed to bill on one of them before holding another.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              type="button"
              onClick={handleSendToKitchen}
              disabled={itemCount === 0}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
            >
              <ChefHat size={16} /> Send to Kitchen
            </button>
            <button
              type="button"
              disabled={itemCount === 0}
              onClick={handleProceedToBill}
              className="rounded-xl bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
            >
              Proceed to Bill
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-warm-200 bg-white px-4 py-2">
          <div className="h-7 w-7 shrink-0 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-extrabold">
            {currentStaff?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <span className="text-xs font-bold text-slate-500 truncate">
            {currentStaff?.name ?? "Staff"}
          </span>
          <button
            type="button"
            onClick={handleBackToTickets}
            className="ml-auto flex items-center gap-1 text-xs font-extrabold text-accent-700"
          >
            <LayoutGrid size={14} /> My Orders
          </button>
        </div>
      </div>

      {/* Item picker sheet */}
      {pickerOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-background">
          <div className="flex items-center gap-3 px-3 h-14 border-b border-warm-200 bg-white shrink-0">
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              aria-label="Close"
              className="h-11 w-11 flex items-center justify-center rounded-full hover:bg-warm-50 text-slate-600"
            >
              <X size={20} />
            </button>
            <h2 className="font-extrabold text-slate-900">Add to Order</h2>
          </div>
          <div className="flex flex-col gap-3 px-3 py-3 border-b border-warm-200 bg-white shrink-0">
            <CategoryTabs
              active={pickerCategory}
              onChange={(c) => {
                setPickerQuery("");
                setPickerCategory(c);
              }}
            />
            <SearchBar value={pickerQuery} onChange={setPickerQuery} />
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {pickerItems.length === 0 ? (
              <p className="text-slate-400 font-semibold text-center py-16">
                No items match &ldquo;{pickerQuery}&rdquo;.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pickerGridEntries.map((entry) =>
                  entry.kind === "single" ? (
                    <MenuCard
                      key={entry.item.id}
                      item={entry.item}
                      onAdd={(opts) => {
                        if (latestRoundId)
                          addItem(ticketId, latestRoundId, entry.item, opts);
                      }}
                    />
                  ) : (
                    <GroupedMenuCard
                      key={entry.groupName}
                      groupName={entry.groupName}
                      variants={entry.variants}
                      onSelect={(item, opts) => {
                        if (latestRoundId)
                          addItem(ticketId, latestRoundId, item, opts);
                      }}
                    />
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Void confirmation sheet */}
      {voidTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50"
          onClick={() => setVoidTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-extrabold text-slate-900 mb-1">
              Remove {voidTarget.name}?
            </h3>
            <p className="text-xs text-slate-500 font-semibold mb-4">
              Choose a reason — this is logged for reconciliation.
            </p>
            <div className="space-y-2">
              {VOID_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => confirmVoid(reason)}
                  className="w-full rounded-xl border border-warm-200 hover:border-rose-300 hover:bg-rose-50 text-left px-4 py-3 font-bold text-slate-700"
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setVoidTarget(null)}
              className="w-full mt-3 text-center text-sm font-bold text-slate-400 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Note editor sheet */}
      {noteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50"
          onClick={() => setNoteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-extrabold text-slate-900 mb-3">
              Note for {noteTarget.name}
            </h3>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="e.g. No ice, extra spicy…"
              rows={3}
              autoFocus
              className="w-full rounded-xl border border-warm-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent-400 resize-none"
            />
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setNoteTarget(null)}
                className="flex-1 rounded-xl border-2 border-warm-200 text-slate-500 font-extrabold py-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveNote}
                className="flex-1 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-extrabold py-3"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
