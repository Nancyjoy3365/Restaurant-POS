import { TableGrid } from "@/components/floor/TableGrid";

const LEGEND = [
  { label: "Free", className: "bg-status-free" },
  { label: "Occupied", className: "bg-status-occupied" },
  { label: "Needs Bill", className: "bg-status-needsbill" },
  { label: "Reserved", className: "bg-status-reserved" },
];

export default function FloorViewPage() {
  return (
    <div className="flex-1 flex flex-col">
      <header className="min-h-16 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3 border-b border-warm-200 bg-white">
        <h1 className="text-xl font-black text-slate-900 whitespace-nowrap">
          Floor View
        </h1>
        <div className="flex items-center gap-4 flex-wrap">
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-full shrink-0 ${item.className}`} />
              <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <TableGrid />
      </main>
    </div>
  );
}
