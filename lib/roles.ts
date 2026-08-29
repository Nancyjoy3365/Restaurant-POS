import type { StaffRole } from "./types";

export const ROLE_ALLOWED_PATHS: Record<StaffRole, string[]> = {
  Manager: ["/", "/menu-management", "/inventory", "/staff", "/cashier", "/reports"],
  Chef: ["/", "/menu-management", "/inventory"],
  "Kitchen Assistant": ["/", "/menu-management", "/inventory"],
  Cashier: ["/", "/cashier"],
  Waiter: ["/my-tickets"],
};

export const ROLE_LOGIN_ORDER: StaffRole[] = [
  "Waiter",
  "Chef",
  "Kitchen Assistant",
  "Manager",
  "Cashier",
];

// Where each role lands right after picking themselves off the staff grid.
// No dedicated Kitchen View exists yet, so Chef/Kitchen Assistant land on
// the closest existing screen for their role.
export function getDefaultRouteForRole(role: StaffRole): string {
  switch (role) {
    case "Manager":
      return "/reports";
    case "Cashier":
      return "/cashier";
    case "Chef":
    case "Kitchen Assistant":
      return "/inventory";
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

// Waiters can prepare and print a bill, but only cashiers and managers are
// allowed to actually record money coming in — keeps cash handling
// auditable and separate from order-taking.
export function canRecordPayments(role: StaffRole): boolean {
  return role === "Cashier" || role === "Manager";
}
