import type { StaffRole } from "./types";

export const ROLE_ALLOWED_PATHS: Record<StaffRole, string[]> = {
  Admin: ["/", "/menu-management", "/inventory", "/staff", "/cashier", "/reports"],
  Chef: ["/", "/menu-management", "/inventory", "/kitchen"],
  "Kitchen Assistant": ["/", "/menu-management", "/inventory", "/kitchen"],
  Cashier: ["/", "/cashier"],
  Waiter: ["/my-tickets"],
};

export const ROLE_LOGIN_ORDER: StaffRole[] = [
  "Waiter",
  "Chef",
  "Kitchen Assistant",
  "Admin",
  "Cashier",
];

// Where each role lands right after picking themselves off the staff grid.
export function getDefaultRouteForRole(role: StaffRole): string {
  switch (role) {
    case "Admin":
      return "/reports";
    case "Cashier":
      return "/cashier";
    case "Chef":
    case "Kitchen Assistant":
      return "/kitchen";
    default:
      return "/my-tickets";
  }
}

export function canAccessPath(role: StaffRole, pathname: string): boolean {
  if (pathname.startsWith("/ticket/") || pathname.startsWith("/billing/")) {
    return true;
  }
  return ROLE_ALLOWED_PATHS[role].includes(pathname);
}

// Waiters can prepare and print a bill, but only cashiers and admins are
// allowed to actually record money coming in — keeps cash handling
// auditable and separate from order-taking.
export function canRecordPayments(role: StaffRole): boolean {
  return role === "Cashier" || role === "Admin";
}
