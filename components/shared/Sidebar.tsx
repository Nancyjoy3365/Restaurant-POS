"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, UtensilsCrossed, Boxes, Users, Wallet, BarChart3, LogOut } from "lucide-react";
import clsx from "clsx";
import { usePosStore } from "@/lib/store";
import { ROLE_ALLOWED_PATHS } from "@/lib/roles";

const NAV_ITEMS = [
  { href: "/", label: "Floor View", icon: LayoutGrid },
  { href: "/cashier", label: "Cashier", icon: Wallet },
  { href: "/menu-management", label: "Menu Management", icon: UtensilsCrossed },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/staff", label: "Staff & Payroll", icon: Users },
  { href: "/reports", label: "Daily Summary", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const staff = usePosStore((s) => s.staff);
  const logout = usePosStore((s) => s.logout);
  const currentStaff = staff.find((s) => s.id === currentStaffId);
  const allowedPaths = currentStaff
    ? ROLE_ALLOWED_PATHS[currentStaff.role]
    : ["/"];
  const navItems = NAV_ITEMS.filter((item) => allowedPaths.includes(item.href));

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <>
      <nav className="hidden lg:flex flex-col w-64 shrink-0 border-r border-warm-200 bg-white">
        <div className="h-20 flex items-center px-6 border-b border-warm-200">
          <span className="text-xl font-black tracking-tight text-accent-600">
            Baraka Grill
          </span>
        </div>
        <div className="flex-1 py-4 px-3 space-y-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
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
