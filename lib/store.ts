import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PosState {
  currentStaffId: string | null;

  login: (staffId: string) => void;
  logout: () => void;
}

// What's left here is purely this device's own session — who's logged in
// on this browser right now. Every other domain (Vendors/Inventory, Menu,
// Staff, Orders/Billing, Service Expenses, Recipes) now lives in the
// database and is fetched via lib/hooks/*.ts — see lib/hooks/useOrders.ts
// for the most recent and largest of those migrations.
export const usePosStore = create<PosState>()(
  persist(
    (set) => ({
      currentStaffId: null,

      login: (staffId) => set({ currentStaffId: staffId }),
      logout: () => set({ currentStaffId: null }),
    }),
    {
      name: "pos-storage",
      version: 31,
    }
  )
);
