"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { CategoryTabs } from "@/components/order/CategoryTabs";
import { SearchBar } from "@/components/order/SearchBar";
import { MenuCard } from "@/components/order/MenuCard";
import { CartPanel } from "@/components/order/CartPanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { tableLabel } from "@/lib/utils";
import type { MenuCategory, AddOn } from "@/lib/types";

export default function OrderEntryPage() {
  const params = useParams<{ tableId: string }>();
  const tableId = params.tableId;
  const router = useRouter();

  const table = usePosStore((s) => s.tables.find((t) => t.id === tableId));
  const menu = usePosStore((s) => s.menu);
  const order = usePosStore((s) => s.orders[tableId]);
  const ensureOrder = usePosStore((s) => s.ensureOrder);
  const addItem = usePosStore((s) => s.addItem);

  const [activeCategory, setActiveCategory] = useState<MenuCategory>("Starters");
  const [query, setQuery] = useState("");

  useEffect(() => {
    ensureOrder(tableId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

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

  if (!table) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-slate-500 font-bold">Table not found.</p>
        <button
          onClick={() => router.push("/")}
          className="text-accent-600 font-extrabold"
        >
          Back to Floor View
        </button>
      </div>
    );
  }

  const visibleItems =
    searchMatches ?? menu.filter((m) => m.category === activeCategory);
  const currentRoundId = order?.rounds[order.rounds.length - 1]?.id;

  function handleAdd(menuItemId: string, opts: { spiceLevel?: string; addOns?: AddOn[] }) {
    const menuItem = menu.find((m) => m.id === menuItemId);
    if (!menuItem || !currentRoundId) return;
    addItem(tableId, currentRoundId, menuItem, opts);
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
      <div className="flex flex-col min-w-0 lg:flex-1">
        <header className="flex items-center gap-3 px-6 h-16 border-b border-slate-200 bg-white">
          <button
            onClick={() => router.push("/")}
            className="rounded-full p-2 hover:bg-slate-100 text-slate-600"
            aria-label="Back to Floor View"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-black text-slate-900">
            {tableLabel(table)}
          </h1>
          <StatusBadge status={table.status} />
        </header>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-3 border-b border-slate-200 bg-white">
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
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleItems.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item}
                  highlighted={searchMatches?.[0]?.id === item.id}
                  onAdd={(opts) => handleAdd(item.id, opts)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <CartPanel tableId={tableId} />
    </div>
  );
}
