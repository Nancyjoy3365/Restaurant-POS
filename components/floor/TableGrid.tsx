"use client";

import { usePosStore } from "@/lib/store";
import { SECTIONS } from "@/lib/seed-data";
import { TableCard } from "./TableCard";

export function TableGrid() {
  const tables = usePosStore((s) => s.tables);

  return (
    <div className="space-y-8">
      {SECTIONS.map((section) => {
        const sectionTables = tables.filter((t) => t.section === section);
        if (sectionTables.length === 0) return null;
        return (
          <div key={section}>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500 mb-3">
              {section}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {sectionTables.map((table) => (
                <TableCard key={table.id} table={table} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
