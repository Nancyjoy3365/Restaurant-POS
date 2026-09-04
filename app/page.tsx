import { AllTicketsGrid } from "@/components/tickets/AllTicketsGrid";
import { TICKET_STATUS_CONFIG, TICKET_VIEW_LEGEND } from "@/components/tickets/ticketStatus";

export default function AllTicketsPage() {
  return (
    <div className="flex-1 flex flex-col lg:h-full lg:overflow-hidden">
      <header className="shrink-0 min-h-16 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3 border-b border-warm-200 bg-white">
        <h1 className="text-xl font-black text-slate-900 whitespace-nowrap">
          All Orders
        </h1>
        <div className="flex items-center gap-4 flex-wrap">
          {TICKET_VIEW_LEGEND.map((key) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className={`h-3 w-3 rounded-full shrink-0 ${TICKET_STATUS_CONFIG[key].dot}`}
              />
              <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                {TICKET_STATUS_CONFIG[key].label}
              </span>
            </div>
          ))}
        </div>
      </header>
      <main className="flex-1 lg:min-h-0 overflow-y-auto p-6">
        <AllTicketsGrid />
      </main>
    </div>
  );
}
