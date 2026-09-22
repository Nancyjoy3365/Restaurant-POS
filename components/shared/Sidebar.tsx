"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Settings,
  MoreHorizontal,
  ChevronRight,
  X,
} from "lucide-react";
import clsx from "clsx";
import { usePosStore } from "@/lib/store";
import { useStaff } from "@/lib/hooks/useStaff";
import { useOpenOrders } from "@/lib/hooks/useOrders";
import { ROLE_ALLOWED_PATHS } from "@/lib/roles";
import { ticketSubtitle } from "@/components/tickets/ticketStatus";
import { ClockOutButton } from "./ClockOutButton";

const MAX_HELD_ORDERS_PER_WAITER = 5;

interface NavItem {
  href: string;
  label: string;
  mobileLabel: string;
  icon: typeof LayoutGrid;
  children?: { href: string; label: string }[];
}

// mobileLabel is a short, non-wrapping variant for the cramped bottom-nav
// row — the full label is still used on the desktop sidebar and inside the
// mobile "More" sheet, where there's room for it.
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "All Orders", mobileLabel: "Orders", icon: LayoutGrid },
  { href: "/my-tickets", label: "My Orders", mobileLabel: "My Orders", icon: TicketIcon },
  { href: "/kitchen", label: "Kitchen", mobileLabel: "Kitchen", icon: ChefHat },
  { href: "/cashier", label: "Cashier", mobileLabel: "Cashier", icon: Wallet },
  { href: "/menu-management", label: "Menu Management", mobileLabel: "Menu", icon: UtensilsCrossed },
  { href: "/inventory", label: "Inventory", mobileLabel: "Stock", icon: Boxes },
  { href: "/staff", label: "Staff & Payroll", mobileLabel: "Staff", icon: Users },
  { href: "/reports", label: "Financial Summary", mobileLabel: "Finance", icon: BarChart3 },
  { href: "/performance", label: "Performance Tracker", mobileLabel: "Rank", icon: Trophy },
  {
    href: "/settings",
    label: "Settings",
    mobileLabel: "Settings",
    icon: Settings,
    children: [{ href: "/settings/vendors", label: "Vendors" }],
  },
];

// Desktop-only grouping for visual hierarchy — mobile keeps its own flat
// (unlabeled) nav, so this doesn't touch mobileNavItems below. Kitchen isn't
// called out by name in any group spec, but it's a Floor-level, in-service
// screen like the rest of that group, so it lives there rather than being
// dropped from the sidebar.
const NAV_GROUPS: { label: string; hrefs: string[] }[] = [
  { label: "Floor", hrefs: ["/", "/my-tickets", "/kitchen", "/cashier"] },
  { label: "Back of house", hrefs: ["/menu-management", "/inventory", "/staff"] },
  { label: "Reports", hrefs: ["/reports", "/performance"] },
  { label: "System", hrefs: ["/settings"] },
];

// However many role-relevant items exist, the bottom row never shows more
// than this many directly — anything past it collapses into "More" instead
// of cramming a 6th/7th/8th icon into the same row.
const MAX_MOBILE_PRIMARY_ITEMS = 4;

export function Sidebar() {
  const pathname = usePathname();
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const { staff } = useStaff();
  const { tickets, orders } = useOpenOrders();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (pathname.startsWith("/settings")) setSettingsOpen(true);
  }
  const currentStaff = staff.find((s) => s.id === currentStaffId);
  const allowedPaths = currentStaff
    ? ROLE_ALLOWED_PATHS[currentStaff.role]
    : ["/"];
  const navItems = NAV_ITEMS.filter((item) => allowedPaths.includes(item.href))
    .map((item) =>
      item.href === "/performance" && currentStaff?.role === "Waiter"
        ? { ...item, label: "My Performance" }
        : item
    )
    .map((item) =>
      item.children
        ? { ...item, children: item.children.filter((c) => allowedPaths.includes(c.href)) }
        : item
    );
  const showHeldOrders = allowedPaths.includes("/my-tickets");

  // Nested Settings sub-links (e.g. Vendors) don't get their own row in the
  // desktop sidebar — they're rendered indented underneath it instead — but
  // mobile has no room for that nesting, so they're flattened into plain
  // top-level entries there.
  const mobileNavItems: NavItem[] = navItems.flatMap((item) =>
    item.children
      ? [
          item,
          ...item.children.map((c) => ({
            href: c.href,
            label: c.label,
            mobileLabel: c.label,
            icon: item.icon,
          })),
        ]
      : [item]
  );

  // "More" is always present (not just once nav items overflow) since it's
  // also the only place Sign Out lives on mobile — everything past the
  // first few nav items collapses into it alongside that.
  const mobilePrimaryItems = mobileNavItems.slice(0, MAX_MOBILE_PRIMARY_ITEMS);
  const mobileOverflowItems = mobileNavItems.slice(MAX_MOBILE_PRIMARY_ITEMS);
  const isNavPathActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const overflowHasActive = mobileOverflowItems.some((item) =>
    isNavPathActive(item.href)
  );

  const heldTickets = tickets.filter(
    (t) =>
      t.status === "open" &&
      t.waiterId === currentStaffId &&
      orders[t.id]?.onHold &&
      orders[t.id]?.rounds.some((round) => round.items.length > 0)
  );

  const navItemsByHref = new Map(navItems.map((item) => [item.href, item]));
  const navGroups = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.hrefs
      .map((href) => navItemsByHref.get(href))
      .filter((item): item is NavItem => Boolean(item)),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <nav className="hidden lg:flex flex-col w-64 shrink-0 h-screen border-r border-warm-200 bg-white">
        <div className="relative h-32 shrink-0 overflow-hidden border-b border-warm-200">
          {/* eslint-disable-next-line @next/next/no-img-element -- static background asset, same photo used on the login screen; positioned so the storefront's neon sign stays in frame instead of the photo's vertical center */}
          <img
            src="/login-bg.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-slate-900/20" />
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-slate-900/80 px-6 py-3">
            <span className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg bg-accent-600 text-white">
              <UtensilsCrossed size={16} strokeWidth={2.5} />
            </span>
            <span className="text-base font-black tracking-tight text-white leading-tight">
              Samaki Mjini Restaurant
            </span>
          </div>
        </div>
        <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto py-4 px-3">
          {navGroups.map((group, groupIdx) => (
            <div key={group.label}>
              <div
                className={clsx(
                  "text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-[#A69C8C] px-[11px] pb-[5px]",
                  groupIdx === 0 ? "pt-0" : "pt-3"
                )}
              >
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.flatMap(({ href, label, icon: Icon, children }) => {
                  if (children && children.length > 0) {
                    const active = pathname.startsWith(href);
                    return [
                      <div key={href}>
                        <div
                          className={clsx(
                            "relative flex items-center rounded-lg transition-colors",
                            active
                              ? "bg-[#FBE9E1] text-[#E3642E]"
                              : "text-slate-600 hover:bg-[#F7F2EA]"
                          )}
                        >
                          {active && (
                            <span className="absolute left-[-9px] top-[7px] bottom-[7px] w-[3px] rounded-r-[3px] bg-[#E3642E]" />
                          )}
                          <Link
                            href={href}
                            className="flex-1 flex items-center gap-3 px-4 py-3.5 text-base font-extrabold"
                          >
                            <Icon size={22} strokeWidth={2.5} />
                            {label}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setSettingsOpen((o) => !o)}
                            aria-label={settingsOpen ? `Collapse ${label}` : `Expand ${label}`}
                            className="pr-4 py-3.5"
                          >
                            <ChevronRight
                              size={16}
                              className={clsx("transition-transform", settingsOpen && "rotate-90")}
                            />
                          </button>
                        </div>
                        {settingsOpen && (
                          <div
                            className="mt-2 space-y-1 border-l pl-[14px]"
                            style={{ borderColor: "#FAE6DD", marginLeft: "20px" }}
                          >
                            {children.map((child) => {
                              const childActive = pathname === child.href;
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={clsx(
                                    "flex items-center gap-3 rounded-lg pr-4 py-2.5 text-sm font-bold transition-colors",
                                    childActive
                                      ? "bg-[#FBE9E1] text-[#E3642E]"
                                      : "text-slate-500 hover:bg-[#F7F2EA]"
                                  )}
                                >
                                  <span className="w-[22px] shrink-0" aria-hidden="true" />
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>,
                    ];
                  }
                  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
                  const link = (
                    <Link
                      key={href}
                      href={href}
                      className={clsx(
                        "relative flex items-center gap-3 rounded-lg px-4 py-3.5 text-base font-extrabold transition-colors",
                        active
                          ? "bg-[#FBE9E1] text-[#E3642E]"
                          : "text-slate-600 hover:bg-[#F7F2EA]"
                      )}
                    >
                      {active && (
                        <span className="absolute left-[-9px] top-[7px] bottom-[7px] w-[3px] rounded-r-[3px] bg-[#E3642E]" />
                      )}
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
                              {ticketSubtitle(ticket) && ` · ${ticketSubtitle(ticket)}`}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>,
                  ];
                })}
              </div>
            </div>
          ))}
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
              <ClockOutButton
                className="shrink-0 rounded-full p-2.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600"
                aria-label="Switch user"
                title="Switch user"
              >
                <LogOut size={18} />
              </ClockOutButton>
            </div>
          </div>
        )}
      </nav>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-center gap-1 px-1 py-1 border-t border-warm-200 bg-white">
        {mobilePrimaryItems.map(({ href, mobileLabel, icon: Icon }) => {
          const active = isNavPathActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] py-1.5 rounded-xl text-[10px] font-bold transition-colors",
                active ? "bg-accent-100 text-accent-700" : "text-slate-500"
              )}
            >
              <Icon size={20} strokeWidth={2.5} />
              <span className="max-w-full px-1 truncate">{mobileLabel}</span>
            </Link>
          );
        })}
        {currentStaff?.role === "Waiter" ? (
          <ClockOutButton className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] py-1.5 rounded-xl text-[10px] font-bold transition-colors text-slate-500">
            <LogOut size={20} strokeWidth={2.5} />
            <span>Sign Out</span>
          </ClockOutButton>
        ) : (
          <button
            type="button"
            onClick={() => setMoreSheetOpen(true)}
            className={clsx(
              "flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] py-1.5 rounded-xl text-[10px] font-bold transition-colors",
              overflowHasActive ? "bg-accent-100 text-accent-700" : "text-slate-500"
            )}
          >
            <MoreHorizontal size={20} strokeWidth={2.5} />
            <span>More</span>
          </button>
        )}
      </nav>

      {moreSheetOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end bg-slate-900/50"
          onClick={() => setMoreSheetOpen(false)}
        >
          <div
            className="w-full rounded-t-3xl bg-white p-4 pb-6 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-extrabold text-slate-900">More</h3>
              <button
                type="button"
                onClick={() => setMoreSheetOpen(false)}
                aria-label="Close"
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {mobileOverflowItems.map(({ href, label, icon: Icon }) => {
                const active = isNavPathActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreSheetOpen(false)}
                    className={clsx(
                      "flex flex-col items-center justify-center gap-1.5 min-h-[64px] rounded-2xl px-2 py-3 text-xs font-bold text-center transition-colors",
                      active
                        ? "bg-accent-100 text-accent-700"
                        : "bg-warm-50 text-slate-600"
                    )}
                  >
                    <Icon size={22} strokeWidth={2.5} />
                    <span className="leading-tight">{label}</span>
                  </Link>
                );
              })}
              {currentStaff && (
                <ClockOutButton className="flex flex-col items-center justify-center gap-1.5 min-h-[64px] rounded-2xl px-2 py-3 text-xs font-bold text-center transition-colors bg-rose-50 text-rose-600">
                  <LogOut size={22} strokeWidth={2.5} />
                  <span className="leading-tight">Sign Out</span>
                </ClockOutButton>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}
