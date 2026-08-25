"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Users, Check, X } from "lucide-react";
import clsx from "clsx";
import type { RestaurantTable } from "@/lib/types";
import { usePosStore } from "@/lib/store";
import { STATUS_CONFIG } from "@/components/shared/StatusBadge";
import { tableLabel } from "@/lib/utils";

export function TableCard({ table }: { table: RestaurantTable }) {
  const router = useRouter();
  const renameTable = usePosStore((s) => s.renameTable);
  const setTableStatus = usePosStore((s) => s.setTableStatus);
  const order = usePosStore((s) => s.orders[table.id]);
  const staff = usePosStore((s) => s.staff);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(table.customName ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const servingWaiter = order?.waiterId
    ? staff.find((m) => m.id === order.waiterId)
    : undefined;

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const cfg = STATUS_CONFIG[table.status];

  function openTable() {
    if (table.status === "free") setTableStatus(table.id, "occupied");
    router.push(`/order/${table.id}`);
  }

  function saveName() {
    renameTable(table.id, draft);
    setEditing(false);
  }

  return (
    <div
      className={clsx(
        "relative rounded-2xl p-4 h-32 flex flex-col justify-between shadow-sm cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.99]",
        cfg.bg
      )}
      onClick={() => !editing && openTable()}
    >
      <div className="flex items-start justify-between">
        <div className="text-white">
          <div className="text-2xl font-black leading-none">T{table.number}</div>
          <div className="text-xs font-bold opacity-90 mt-1">{table.section}</div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDraft(table.customName ?? "");
            setEditing(true);
          }}
          className="rounded-full bg-white/20 hover:bg-white/35 p-1.5 text-white"
          aria-label="Rename table"
        >
          <Pencil size={14} />
        </button>
      </div>

      {editing ? (
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder="e.g. Smith Party"
            className="min-w-0 flex-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-900 bg-white/95 outline-none"
          />
          <button
            type="button"
            onClick={saveName}
            className="rounded-md bg-white/90 p-1 text-slate-900"
            aria-label="Save name"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md bg-white/30 p-1 text-white"
            aria-label="Cancel"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex items-end justify-between">
          <div className="text-white">
            {table.customName && (
              <div className="text-sm font-extrabold truncate max-w-[8rem]">
                {table.customName}
              </div>
            )}
            <div className="flex items-center gap-1 text-xs font-bold opacity-90">
              <Users size={12} /> {table.seats} seats
            </div>
            {servingWaiter && (
              <div className="text-[10px] font-bold opacity-80 truncate max-w-[8rem]">
                Opened by {servingWaiter.name.split(" ")[0]}
              </div>
            )}
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-white/90">
            {cfg.label}
          </span>
        </div>
      )}
    </div>
  );
}

export function tableCardLabel(table: RestaurantTable) {
  return tableLabel(table);
}
