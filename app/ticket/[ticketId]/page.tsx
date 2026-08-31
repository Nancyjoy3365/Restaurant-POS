"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { CategoryTabs } from "@/components/order/CategoryTabs";
import { SearchBar } from "@/components/order/SearchBar";
import { MenuCard } from "@/components/order/MenuCard";
import { GroupedMenuCard } from "@/components/order/GroupedMenuCard";
import { CartPanel } from "@/components/order/CartPanel";
import { OrderScreenMobile } from "@/components/order/OrderScreen.Mobile";
import { groupMenuItems } from "@/lib/menuGrouping";
import type { MenuCategory, AddOn } from "@/lib/types";

export default function TicketPage() {
  const params = useParams<{ ticketId: string }>();
  const ticketId = params.ticketId;
  const router = useRouter();

  const ticket = usePosStore((s) => s.tickets.find((t) => t.id === ticketId));
  const order = usePosStore((s) => s.orders[ticketId]);
  const menu = usePosStore((s) => s.menu);
  const addItem = usePosStore((s) => s.addItem);

  const [activeCategory, setActiveCategory] = useState<MenuCategory>("Main");
  const [query, setQuery] = useState("");

  const searchMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return menu.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.aliases.some((a) => a.toLowerCase().includes(q))
    );
  }, [query, menu]);

  useEffect(() => {
    if (searchMatches && searchMatches.length > 0) {
      const el = document.getElementById(`menu-item-${searchMatches[0].id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [searchMatches]);

  const displayCategory = searchMatches?.[0]?.category ?? activeCategory;

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

  const visibleItems =
    searchMatches ?? menu.filter((m) => m.category === activeCategory);
  // Grouping into one "Fish"-style card only applies to the default
  // browsing grid — an active search still jumps straight to the specific
  // matching variant, unaffected by grouping.
  const gridEntries = searchMatches
    ? visibleItems.map((item) => ({ kind: "single" as const, item }))
    : groupMenuItems(visibleItems);
  const currentRoundId = order?.rounds[order.rounds.length - 1]?.id;

  function handleAdd(menuItemId: string, opts: { spiceLevel?: string; addOns?: AddOn[] }) {
    const menuItem = menu.find((m) => m.id === menuItemId);
    if (!menuItem || !currentRoundId) return;
    addItem(ticketId, currentRoundId, menuItem, opts);
  }

  return (
    <>
      <OrderScreenMobile ticketId={ticketId} />
      <div className="flex-1 flex flex-col lg:flex-row lg:h-full lg:overflow-hidden">
      <div className="flex flex-col min-w-0 lg:flex-1 lg:min-h-0">
        <header className="flex items-center gap-3 px-6 h-16 border-b border-warm-200 bg-white">
          <button
            onClick={() => router.back()}
            className="rounded-full p-2 hover:bg-slate-100 text-slate-600"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900">
              Order No. {ticket.displayNumber}
            </h1>
            {ticket.locationNote && (
              <p className="text-xs font-semibold text-slate-400">
                {ticket.locationNote}
              </p>
            )}
          </div>
        </header>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-3 border-b border-warm-200 bg-white">
          <CategoryTabs
            active={displayCategory}
            onChange={(c) => {
              setQuery("");
              setActiveCategory(c);
            }}
          />
          <SearchBar value={query} onChange={setQuery} />
        </div>

        <main className="lg:flex-1 lg:overflow-y-auto p-6">
          {visibleItems.length === 0 ? (
            <p className="text-slate-400 font-semibold text-center py-16">
              No items match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gridEntries.map((entry) =>
                entry.kind === "single" ? (
                  <MenuCard
                    key={entry.item.id}
                    item={entry.item}
                    highlighted={searchMatches?.[0]?.id === entry.item.id}
                    onAdd={(opts) => handleAdd(entry.item.id, opts)}
                  />
                ) : (
                  <GroupedMenuCard
                    key={entry.groupName}
                    groupName={entry.groupName}
                    variants={entry.variants}
                    onSelect={(item, opts) => handleAdd(item.id, opts)}
                  />
                )
              )}
            </div>
          )}
        </main>
      </div>

      <CartPanel ticketId={ticketId} />
      </div>
    </>
  );
}
