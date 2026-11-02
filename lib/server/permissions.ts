import type { StaffRole } from "@/lib/types";

// Which roles may call which API route, enforced on the server by proxy.ts.
// Mirrors the screens each role can open (lib/roles.ts ROLE_ALLOWED_PATHS),
// so nothing a role already does from its own screens is blocked. Any route
// not listed here is Admin-only — a new route stays locked down until it's
// deliberately added.

const ALL: StaffRole[] = ["Admin", "Cashier", "Waiter", "Chef", "Kitchen Assistant"];
const MONEY: StaffRole[] = ["Admin", "Cashier"];
// Roles that can open Menu Management and Inventory.
const BACK_OF_HOUSE: StaffRole[] = ["Admin", "Chef", "Kitchen Assistant"];
const ADMIN: StaffRole[] = ["Admin"];

type Rule = { methods: string[]; path: RegExp; roles: StaffRole[] };

const ID = "[^/]+";
const rule = (methods: string, path: string, roles: StaffRole[]): Rule => ({
  methods: methods.split(","),
  path: new RegExp(`^/api/${path}$`),
  roles,
});

const RULES: Rule[] = [
  rule("GET", "auth/me", ALL),

  // Taking orders, billing and the kitchen — every role does these.
  rule("GET,POST", "orders", ALL),
  rule("GET", `orders/${ID}`, ALL),
  rule("POST", `orders/${ID}/(items|rounds|hold|resume|ready-all|start-billing|payments|finalize-receipt)`, ALL),
  rule("POST", "orders/cancel-empty", ALL),
  rule("PATCH,DELETE", `order-line-items/${ID}`, ALL),
  rule("PATCH", `order-line-items/${ID}/note`, ALL),
  rule("POST", `order-line-items/${ID}/(ready|void)`, ALL),
  rule("POST", `rounds/${ID}/send`, ALL),
  rule("GET", "tickets", ALL),
  rule("GET", "payments", ALL),
  rule("GET", "receipts", ALL),
  rule("GET", "menu", ALL),
  rule("GET", "restaurant-settings", ALL),
  // Pay fields are stripped for non-Admins in the route itself.
  rule("GET", "staff", ALL),
  // Self-only for non-Admins — checked separately in proxy.ts.
  rule("POST", `staff/${ID}/(clock-in|clock-out)`, ALL),

  // Cashier desk: verifying, reversing and reconciling money.
  rule("POST", `orders/${ID}/(confirm-complete|reverse-last-payment)`, MONEY),
  rule("POST", `payments/${ID}/reverse`, MONEY),
  rule("GET,POST", "cash-drops", MONEY),
  rule("DELETE", `cash-drops/${ID}`, MONEY),

  // Menu Management and Inventory.
  rule("POST", "menu", BACK_OF_HOUSE),
  rule("PATCH", `menu/${ID}`, BACK_OF_HOUSE),
  rule("POST", `menu/${ID}/(availability|priority)`, BACK_OF_HOUSE),
  rule("GET,POST", "ingredients", BACK_OF_HOUSE),
  rule("PATCH", `ingredients/${ID}`, BACK_OF_HOUSE),
  rule("GET,POST", "units-of-measure", BACK_OF_HOUSE),
  rule("GET,POST", "stock-purchases", BACK_OF_HOUSE),
  rule("GET,POST", "vendor-payments", BACK_OF_HOUSE),
  rule("GET,POST", "vendors", BACK_OF_HOUSE),
  rule("PATCH", `vendors/${ID}`, BACK_OF_HOUSE),
  rule("POST", `vendors/${ID}/active`, BACK_OF_HOUSE),
  rule("GET,POST", "service-expenses", BACK_OF_HOUSE),
  rule("PATCH,DELETE", `service-expenses/${ID}`, BACK_OF_HOUSE),

  // Admin only: staff and pay, leave, incentives, settings, deleting menu
  // items, and the report-only recipe data.
  rule("DELETE", `menu/${ID}`, ADMIN),
  rule("POST", "staff", ADMIN),
  rule("PATCH", `staff/${ID}`, ADMIN),
  rule("GET", "shifts", ADMIN),
  rule("GET,POST", "leave-records", ADMIN),
  rule("PATCH,DELETE", `leave-records/${ID}`, ADMIN),
  rule("GET,POST", "incentive-records", ADMIN),
  rule("PATCH", "restaurant-settings", ADMIN),
  rule("GET", "recipes", ADMIN),
];

export function allowedRoles(method: string, pathname: string): StaffRole[] {
  const match = RULES.find((r) => r.methods.includes(method) && r.path.test(pathname));
  return match ? match.roles : ADMIN;
}

// Routes reachable before logging in. Everything else needs a session.
export function isPublicRoute(method: string, pathname: string): boolean {
  return (
    (method === "POST" && pathname === "/api/auth/login") ||
    (method === "POST" && pathname === "/api/auth/logout") ||
    (method === "GET" && pathname === "/api/auth/staff-directory") ||
    // Changing the shared PIN is offered on the login screen; the route
    // itself requires the current PIN and is rate-limited.
    (method === "POST" && pathname === "/api/staff-pin")
  );
}
