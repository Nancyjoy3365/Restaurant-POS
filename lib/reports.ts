import type {
  Receipt,
  Recipe,
  Ingredient,
  VendorPayment,
  StockPurchase,
  StaffMember,
  ShiftEntry,
  Payment,
  LeaveRecord,
  MenuCategory,
  PaymentMethod,
  MenuItem,
} from "./types";
import { payoutForRange } from "./payroll";

// Cost of goods sold for a set of receipts, using each dish's Recipe →
// Ingredient unit cost. Only dishes with a Recipe defined contribute to
// COGS — items without one (most of the menu, in this demo) are treated as
// having no tracked ingredient cost rather than guessed at.
export function computeCogs(
  receipts: Receipt[],
  recipes: Recipe[],
  ingredients: Ingredient[]
): number {
  const recipeByMenuItem = new Map(recipes.map((r) => [r.menuItemId, r]));
  const ingredientById = new Map(ingredients.map((i) => [i.id, i]));

  let cogs = 0;
  for (const receipt of receipts) {
    for (const line of receipt.items) {
      const recipe = recipeByMenuItem.get(line.menuItemId);
      if (!recipe) continue;
      const foodCostPerUnit = recipe.components.reduce((sum, c) => {
        const ing = ingredientById.get(c.ingredientId);
        return sum + (ing ? ing.unitCost * c.qty : 0);
      }, 0);
      cogs += foodCostPerUnit * line.qty;
    }
  }
  return cogs;
}

export function isToday(timestampMs: number, now = new Date()): boolean {
  return new Date(timestampMs).toDateString() === now.toDateString();
}

// Sums what was actually paid to vendors in [start, end] — a cash-out
// figure distinct from COGS (which only counts ingredients actually used in
// a sold, recipe-tracked dish). Reads the real VendorPayment ledger, not a
// vendor snapshot, so multiple payments to the same vendor all count.
export function vendorPaymentsInRange(
  vendorPayments: VendorPayment[],
  start: Date,
  end: Date
): number {
  return vendorPayments
    .filter((p) => p.paidAt >= start.getTime() && p.paidAt <= end.getTime())
    .reduce((sum, p) => sum + p.amount, 0);
}

// Sums stock purchased in [start, end] — another cash-out figure distinct
// from COGS. Reads the StockPurchase ledger, so every restock counts, not
// just an ingredient's single latest purchase snapshot.
export function stockPurchasesInRange(
  stockPurchases: StockPurchase[],
  start: Date,
  end: Date
): number {
  return stockPurchases
    .filter((p) => p.purchasedAt >= start.getTime() && p.purchasedAt <= end.getTime())
    .reduce((sum, p) => sum + p.totalCost, 0);
}

export interface NetBreakdown {
  revenue: number;
  vatCollected: number;
  cogs: number;
  grossMargin: number;
  staffPayouts: number;
  vendorPayments: number;
  stockPurchases: number;
  net: number;
}

// The single source of truth behind every Financial Summary figure — used
// both for the page's own [start, end] totals and, one calendar day at a
// time, to build the Net Trend chart. Sharing one function means the two
// can never quietly drift apart from each other.
export function computeNetBreakdown(
  receipts: Receipt[],
  recipes: Recipe[],
  ingredients: Ingredient[],
  staff: StaffMember[],
  shifts: ShiftEntry[],
  payments: Payment[],
  leaveRecords: LeaveRecord[],
  vendorPaymentRecords: VendorPayment[],
  stockPurchaseRecords: StockPurchase[],
  start: Date,
  end: Date
): NetBreakdown {
  const receiptsInRange = receipts.filter(
    (r) => r.issuedAt >= start.getTime() && r.issuedAt <= end.getTime()
  );
  const revenue = receiptsInRange.reduce((sum, r) => sum + r.subtotal, 0);
  const vatCollected = receiptsInRange.reduce((sum, r) => sum + r.vat, 0);
  const cogs = computeCogs(receiptsInRange, recipes, ingredients);
  const grossMargin = revenue - cogs;
  const staffPayouts = staff.reduce(
    (sum, member) =>
      sum + payoutForRange(member, shifts, payments, leaveRecords, start, end),
    0
  );
  const vendorPayments = vendorPaymentsInRange(vendorPaymentRecords, start, end);
  const stockPurchases = stockPurchasesInRange(stockPurchaseRecords, start, end);
  const net = grossMargin - staffPayouts - vendorPayments - stockPurchases;
  return {
    revenue,
    vatCollected,
    cogs,
    grossMargin,
    staffPayouts,
    vendorPayments,
    stockPurchases,
    net,
  };
}

export interface RevenueByMethod {
  // VAT-inclusive — what customers were actually charged, so it's directly
  // comparable to the payments collected against it.
  total: number;
  vat: number;
  methods: { method: PaymentMethod; amount: number }[];
  // total minus every payment line. Positive: billed but not matched to any
  // payment; negative: more was paid in than was billed.
  unmatched: number;
}

const PAYMENT_METHOD_ORDER: PaymentMethod[] = ["mpesa", "cash"];

export function revenueByPaymentMethod(receipts: Receipt[]): RevenueByMethod {
  let total = 0;
  let vat = 0;
  const byMethod = new Map<PaymentMethod, number>();
  for (const receipt of receipts) {
    total += receipt.total;
    vat += receipt.vat;
    for (const p of receipt.payments) {
      byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);
    }
  }
  const methods = Array.from(byMethod, ([method, amount]) => ({ method, amount })).sort(
    (a, b) => PAYMENT_METHOD_ORDER.indexOf(a.method) - PAYMENT_METHOD_ORDER.indexOf(b.method)
  );
  const paid = methods.reduce((sum, m) => sum + m.amount, 0);
  return { total, vat, methods, unmatched: total - paid };
}

// Soda and Water share one group on the report; Packaging is left out
// entirely (bags/containers aren't something "sold" in the menu sense).
export type SalesGroup = "Main" | "Juice" | "Extras" | "Soda & water" | "Other";

export const SALES_GROUP_ORDER: SalesGroup[] = ["Main", "Juice", "Extras", "Soda & water", "Other"];

const SALES_GROUP_BY_CATEGORY: Record<MenuCategory, SalesGroup | null> = {
  Main: "Main",
  Juice: "Juice",
  Extra: "Extras",
  Soda: "Soda & water",
  Water: "Soda & water",
  Packaging: null,
};

const TAKEAWAY_RE = /\btake\s*-?\s*away\b/i;

// The menu has no takeaway flag — takeaway versions are separate menu items
// marked only in their name, spelled several ways ("Fish (Wet) Takeaway",
// "Passion (Take away)", "Kachumbari Take Away"), with the in-house twin
// sometimes labelled "(Inhouse)". Stripping those markers gives the shared
// dish name both versions are counted under.
function splitTakeaway(name: string): { baseName: string; isTakeaway: boolean } {
  const isTakeaway = TAKEAWAY_RE.test(name);
  const baseName = name
    .replace(/\(\s*(take\s*-?\s*away|in\s*-?\s*house)\s*\)/gi, "")
    .replace(new RegExp(TAKEAWAY_RE.source, "gi"), "")
    .replace(/\s+/g, " ")
    .trim();
  return { baseName: baseName || name, isTakeaway };
}

export interface ItemSalesRow {
  key: string;
  name: string;
  inHouse: number;
  takeaway: number;
  total: number;
}

export interface ItemSalesGroup {
  group: SalesGroup;
  total: number;
  rows: ItemSalesRow[];
}

export interface ItemsSoldReport {
  groups: ItemSalesGroup[];
  totalQty: number;
  // Distinct menu items sold, before takeaway versions are merged.
  distinctMenuItems: number;
}

// A line whose menu item no longer exists falls under "Other" rather than
// being dropped. Groups come back in SALES_GROUP_ORDER, rows by total.
export function itemsSoldReport(receipts: Receipt[], menu: MenuItem[]): ItemsSoldReport {
  const menuById = new Map(menu.map((m) => [m.id, m]));
  const rowsByGroup = new Map<SalesGroup, Map<string, ItemSalesRow>>();
  const menuItemIds = new Set<string>();
  let totalQty = 0;

  for (const receipt of receipts) {
    for (const line of receipt.items) {
      const menuItem = menuById.get(line.menuItemId);
      const group = menuItem ? SALES_GROUP_BY_CATEGORY[menuItem.category] : "Other";
      if (!group) continue;
      const { baseName, isTakeaway } = splitTakeaway(menuItem?.name ?? line.name);
      const key = baseName.toLowerCase();
      const rows = rowsByGroup.get(group) ?? new Map<string, ItemSalesRow>();
      const row = rows.get(key) ?? { key, name: baseName, inHouse: 0, takeaway: 0, total: 0 };
      if (isTakeaway) row.takeaway += line.qty;
      else row.inHouse += line.qty;
      row.total += line.qty;
      rows.set(key, row);
      rowsByGroup.set(group, rows);
      menuItemIds.add(line.menuItemId);
      totalQty += line.qty;
    }
  }

  const groups = SALES_GROUP_ORDER.filter((g) => rowsByGroup.has(g)).map((group) => {
    const rows = Array.from(rowsByGroup.get(group)!.values()).sort((a, b) => b.total - a.total);
    return { group, total: rows.reduce((sum, r) => sum + r.total, 0), rows };
  });
  return { groups, totalQty, distinctMenuItems: menuItemIds.size };
}
