"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePosStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentStaffId = usePosStore((s) => s.currentStaffId);
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && !currentStaffId && pathname !== "/login") {
      router.replace("/login");
    }
  }, [hydrated, currentStaffId, pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (!hydrated || !currentStaffId) {
    return <div className="flex-1 min-h-screen bg-slate-50" />;
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
