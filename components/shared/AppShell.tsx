"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePosStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { canAccessPath } from "@/lib/roles";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const staff = usePosStore((s) => s.staff);
  const currentStaff = staff.find((s) => s.id === currentStaffId);
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated || pathname === "/login") return;
    if (!currentStaffId) {
      router.replace("/login");
      return;
    }
    if (currentStaff && !canAccessPath(currentStaff.role, pathname)) {
      router.replace("/");
    }
  }, [hydrated, currentStaffId, currentStaff, pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (
    !hydrated ||
    !currentStaffId ||
    (currentStaff && !canAccessPath(currentStaff.role, pathname))
  ) {
    return <div className="flex-1 min-h-screen bg-background" />;
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col pb-16 lg:pb-0">
        {children}
      </div>
    </>
  );
}
