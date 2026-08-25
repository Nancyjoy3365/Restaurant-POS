"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, UtensilsCrossed, Boxes, Users, LogOut } from "lucide-react";
import clsx from "clsx";
import { usePosStore } from "@/lib/store";

const NAV_ITEMS = [
  { href: "/", label: "Floor View", icon: LayoutGrid },
  { href: "/menu-management", label: "Menu Management", icon: UtensilsCrossed },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/staff", label: "Staff & Payroll", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const staff = usePosStore((s) => s.staff);
  const logout = usePosStore((s) => s.logout);
  const currentStaff = staff.find((s) => s.id === currentStaffId);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <>
      <nav className="hidden lg:flex flex-col w-56 shrink-0 border-r border-slate-200 bg-white">
        <div className="h-16 flex items-center px-5 border-b border-slate-200">
          <span className="text-lg font-black tracking-tight text-accent-700">
            Baraka Grill
          </span>
        </div>
        <div className="flex-1 py-3 px-2 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors",
                  active
                    ? "bg-accent-600 text-white"
                    : "text-slate-600 hover:bg-accent-50 hover:text-accent-700"
                )}
              >
                <Icon size={18} strokeWidth={2.5} />
                {label}
              </Link>
            );
          })}
        </div>
        {currentStaff && (
          <div className="border-t border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2">
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
                className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Log out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </nav>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-slate-200 bg-white">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold",
                active ? "text-accent-600" : "text-slate-500"
              )}
            >
              <Icon size={20} strokeWidth={2.5} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
