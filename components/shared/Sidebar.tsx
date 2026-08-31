"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Ticket as TicketIcon,
  UtensilsCrossed,
  Boxes,
  Users,
  Wallet,
  BarChart3,
  Trophy,
  ChefHat,
  LogOut,
  PauseCircle,
} from "lucide-react";
import clsx from "clsx";
import { usePosStore, MAX_HELD_ORDERS_PER_WAITER } from "@/lib/store";
import { ROLE_ALLOWED_PATHS } from "@/lib/roles";

const NAV_ITEMS = [
  { href: "/", label: "All Orders", icon: LayoutGrid },
  { href: "/my-tickets", label: "My Orders", icon: TicketIcon },
  { href: "/kitchen", label: "Kitchen", icon: ChefHat },
  { href: "/cashier", label: "Cashier", icon: Wallet },
  { href: "/menu-management", label: "Menu Management", icon: UtensilsCrossed },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/staff", label: "Staff & Payroll", icon: Users },
  { href: "/reports", label: "Financial Summary", icon: BarChart3 },
  { href: "/performance", label: "Performance Tracker", icon: Trophy },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const staff = usePosStore((s) => s.staff);
  const tickets = usePosStore((s) => s.tickets);
  const orders = usePosStore((s) => s.orders);
  const logout = usePosStore((s) => s.logout);
  const currentStaff = staff.find((s) => s.id === currentStaffId);
  const allowedPaths = currentStaff
    ? ROLE_ALLOWED_PATHS[currentStaff.role]
    : ["/"];
  const navItems = NAV_ITEMS.filter((item) => allowedPaths.includes(item.href));
  const showHeldOrders = allowedPaths.includes("/my-tickets");

  const heldTickets = tickets.filter(
    (t) =>
      t.status === "open" &&
      t.waiterId === currentStaffId &&
      orders[t.id]?.onHold &&
      orders[t.id]?.rounds.some((round) => round.items.length > 0)
  );

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <>
      <nav className="hidden lg:flex flex-col w-64 shrink-0 border-r border-warm-200 bg-white">
        <div className="h-20 flex items-center px-6 border-b border-warm-200">
          <span className="text-lg font-black tracking-tight text-accent-600 leading-tight">
            Samaki Mjini Restaurant
          </span>
        </div>
        <div className="flex-1 py-4 px-3 space-y-2">
          {navItems.flatMap(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            const link = (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-extrabold transition-colors",
                  active
                    ? "bg-accent-600 text-white shadow-sm"
                    : "bg-warm-50 text-slate-600 hover:bg-accent-100 hover:text-accent-700"
                )}
              >
                <Icon size={22} strokeWidth={2.5} />
                {label}
              </Link>
            );
            if (href !== "/my-tickets" || !showHeldOrders) return [link];
            return [
              link,
              <div
                key="held-orders"
                className="rounded-2xl bg-warm-50 px-4 py-3.5"
              >
                <div className="flex items-center gap-2 text-slate-600 font-extrabold text-xs uppercase tracking-wide">
                  <PauseCircle size={16} strokeWidth={2.5} className="text-accent-600" />
                  Held Orders ({heldTickets.length}/{MAX_HELD_ORDERS_PER_WAITER})
                </div>
                {heldTickets.length === 0 ? (
                  <p className="text-[11px] font-semibold text-slate-400 mt-2">
                    Nothing on hold right now.
                  </p>
                ) : (
                  <div className="space-y-1.5 mt-2.5">
                    {heldTickets.map((ticket) => (
                      <Link
                        key={ticket.id}
                        href={`/ticket/${ticket.id}`}
                        className="block rounded-xl bg-white text-slate-600 hover:bg-accent-100 hover:text-accent-700 font-extrabold text-xs px-3 py-2.5 transition-colors"
                      >
                        Order No. {ticket.displayNumber}
                        {ticket.locationNote && ` · ${ticket.locationNote}`}
                      </Link>
                    ))}
                  </div>
                )}
              </div>,
            ];
          })}
        </div>
        {currentStaff && (
          <div className="border-t border-warm-200 p-4">
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-warm-50 px-3 py-3">
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-900 truncate">
                  {currentStaff.name}
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase">
                  {currentStaff.role}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="shrink-0 rounded-full p-2.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600"
                aria-label="Switch user"
                title="Switch user"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        )}
      </nav>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-warm-200 bg-white">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold",
                active ? "text-accent-600" : "text-slate-500"
              )}
            >
              <Icon size={22} strokeWidth={2.5} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
