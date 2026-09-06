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

export function paymentMethodBreakdown(
  receipts: Receipt[]
): { cash: number; mpesa: number } {
  let cash = 0;
  let mpesa = 0;
  for (const receipt of receipts) {
    for (const p of receipt.payments) {
      if (p.method === "cash") cash += p.amount;
      else mpesa += p.amount;
    }
  }
  return { cash, mpesa };
}

export interface ItemSalesTally {
  name: string;
  qty: number;
}

// Sorted descending by quantity sold — callers take the head for best
// sellers and the tail for worst (worst is only ever among items that sold
// at least once; a never-ordered menu item isn't a meaningful "worst").
export function itemSalesTally(receipts: Receipt[]): ItemSalesTally[] {
  const tally = new Map<string, number>();
  for (const receipt of receipts) {
    for (const line of receipt.items) {
      tally.set(line.name, (tally.get(line.name) ?? 0) + line.qty);
    }
  }
  return Array.from(tally, ([name, qty]) => ({ name, qty })).sort(
    (a, b) => b.qty - a.qty
  );
}
