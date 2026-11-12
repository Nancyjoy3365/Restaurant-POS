"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, Plus, Search, X } from "lucide-react";
import { useOrder, addItem as addItemMutation, cancelEmptyTickets } from "@/lib/hooks/useOrders";
import { useRestaurantSettings } from "@/lib/hooks/useBilling";
import { useMenu } from "@/lib/hooks/useMenu";
import { CATEGORIES } from "@/components/order/CategoryTabs";
import { VariantPickerSheet } from "@/components/order/VariantPickerSheet";
import { CartPanel } from "@/components/order/CartPanel";
import { OrderScreenMobile } from "@/components/order/OrderScreen.Mobile";
import { filterMenuForMode, groupMenuItems, type MenuMode } from "@/lib/menuGrouping";
import { ticketDetailSubtitle } from "@/components/tickets/ticketStatus";
import { formatKES } from "@/lib/utils";
import type { MenuCategory, AddOn, MenuItem } from "@/lib/types";

export default function TicketPage() {
  const params = useParams<{ ticketId: string }>();
  const ticketId = params.ticketId;
  const router = useRouter();

  const { ticket, order } = useOrder(ticketId);
  const { menu } = useMenu();
  const { vatRate } = useRestaurantSettings();

  const [activeCategory, setActiveCategory] = useState<MenuCategory>("Main");
  const [query, setQuery] = useState("");
  // null = follow the ticket's own order type until the waiter flips it.
  const [modeChoice, setMode] = useState<MenuMode | null>(null);
  const mode: MenuMode = modeChoice ?? (ticket?.orderType === "takeaway" ? "takeaway" : "dine_in");
  const [variantSheet, setVariantSheet] = useState<{ name: string; variants: MenuItem[] } | null>(
    null
  );
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" jumps to the search box, as the placeholder hints.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searchMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return menu.filter(
      (m) =>
        m.available &&
        (m.name.toLowerCase().includes(q) ||
          m.aliases.some((a) => a.toLowerCase().includes(q)))
    );
  }, [query, menu]);

  if (!ticket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
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

  const visibleItems = filterMenuForMode(
    searchMatches ?? menu.filter((m) => m.available && m.category === activeCategory),
    menu,
    mode
  );
  // Grouping into one "Fish"-style tile only applies to the default
  // browsing grid — an active search still lists each matching variant.
  const gridEntries = searchMatches
    ? visibleItems.map((item) => ({ kind: "single" as const, item }))
    : groupMenuItems(visibleItems);
  const currentRound = order?.rounds[order.rounds.length - 1];
  const currentRoundId = currentRound?.id;

  function addToOrder(menuItem: MenuItem, opts: { spiceLevel?: string; addOns?: AddOn[] }) {
    if (!currentRoundId) return;
    addItemMutation(ticketId, currentRoundId, menuItem, opts, vatRate);
  }

  // Fired without waiting — a ticket opened and left with nothing added
  // (still zero items in every round) shouldn't linger in the cashier's
  // Active Orders list just because someone glanced at the menu and backed
  // out; this sweeps it away same as clocking out already does.
  function handleBack() {
    cancelEmptyTickets().catch((err) => console.error("Empty-ticket cleanup failed:", err));
    router.back();
  }

  return (
    <>
      <OrderScreenMobile ticketId={ticketId} />
      <div className="flex-1 flex flex-col lg:flex-row lg:h-full lg:overflow-hidden">
        <div className="flex flex-col min-w-0 lg:flex-1 lg:min-h-0">
          <div className="shrink-0 border-b border-warm-200 bg-white px-6 pt-4 pb-3 space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="rounded-full p-1.5 -ml-1.5 hover:bg-warm-50 text-slate-700"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-black text-slate-900 leading-tight">
                  Order No. {ticket.displayNumber}
                </h1>
                {ticketDetailSubtitle(ticket) && (
                  <p className="text-xs font-semibold text-slate-400 truncate">
                    {ticketDetailSubtitle(ticket)}
                  </p>
                )}
              </div>
              <div className="relative w-64 shrink-0">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search menu  ( / )"
                  className="w-full rounded-lg border border-warm-200 bg-warm-50 pl-9 pr-8 py-2 text-sm font-semibold outline-none focus:border-accent-400 focus:bg-white"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(({ name }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveCategory(name);
                  }}
                  className={clsx(
                    "rounded-full px-4 py-1.5 text-xs font-bold transition-colors",
                    !searchMatches && activeCategory === name
                      ? "bg-accent-600 text-white"
                      : "bg-warm-50 text-slate-600 border border-warm-200 hover:border-accent-300"
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <main className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto p-6">
            {gridEntries.length === 0 ? (
              <p className="text-slate-400 font-semibold text-center py-16">
                {searchMatches ? <>No items match &ldquo;{query}&rdquo;.</> : "No items in this category."}
              </p>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {gridEntries.map((entry) => {
                  const variants = entry.kind === "single" ? [entry.item] : entry.variants;
                  const name = entry.kind === "single" ? entry.item.name : entry.groupName;
                  const ids = new Set(variants.map((v) => v.id));
                  const qty = (currentRound?.items ?? [])
                    .filter((i) => ids.has(i.menuItemId))
                    .reduce((s, i) => s + i.qty, 0);
                  const minPrice = Math.min(...variants.map((v) => v.price));
                  const isGroup = entry.kind === "group";
                  const hasSpice = !isGroup && (entry.item.spiceLevels?.length ?? 0) > 0;
                  const subtitle = isGroup
                    ? variants.length <= 3
                      ? variants.map((v) => v.variantLabel ?? v.name).join(" · ")
                      : "Choose option"
                    : hasSpice
                    ? "Choose spice level"
                    : "Tap to add";
                  return (
                    <button
                      key={isGroup ? entry.groupName : entry.item.id}
                      type="button"
                      onClick={() =>
                        isGroup || hasSpice
                          ? setVariantSheet({ name, variants })
                          : addToOrder(variants[0], {})
                      }
                      className={clsx(
                        "group relative text-left rounded-xl border bg-white px-3.5 py-3 transition-colors hover:border-accent-400 active:bg-accent-50",
                        qty > 0 ? "border-accent-500" : "border-warm-200"
                      )}
                    >
                      {qty > 0 && (
                        <span className="absolute top-2 right-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1.5 text-[11px] font-extrabold text-white">
                          {qty}
                        </span>
                      )}
                      <div className="pr-6 text-sm font-extrabold text-slate-900 truncate">
                        {name}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500 truncate">
                        {subtitle}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-extrabold text-accent-700">
                          {isGroup && variants.length > 1 ? "From " : ""}
                          {formatKES(minPrice)}
                        </span>
                        <span
                          aria-hidden
                          className="inline-flex items-center gap-1 rounded-full bg-accent-600 group-hover:bg-accent-700 px-3 py-1.5 text-xs font-extrabold text-white"
                        >
                          <Plus size={13} strokeWidth={3} />
                          {isGroup || hasSpice ? "Choose" : "Add"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </main>
        </div>

        <CartPanel ticketId={ticketId} mode={mode} onModeChange={setMode} />
      </div>

      {variantSheet && (
        <VariantPickerSheet
          groupName={variantSheet.name}
          variants={variantSheet.variants}
          onSelect={(item, opts) => {
            addToOrder(item, opts);
            setVariantSheet(null);
          }}
          onClose={() => setVariantSheet(null)}
        />
      )}
    </>
  );
}
