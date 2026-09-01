import type { Receipt, Recipe, Ingredient, Vendor } from "./types";

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

// Sums what was paid to vendors in [start, end] — a cash-out figure distinct
// from COGS (which only counts ingredients actually used in a sold, recipe-
// tracked dish). A Vendor only stores its single most recent payment, so
// this reflects that snapshot rather than a full payment ledger.
export function vendorPaymentsInRange(
  vendors: Vendor[],
  start: Date,
  end: Date
): number {
  return vendors
    .filter((v) => {
      const paidAt = new Date(`${v.lastPaymentDate}T12:00:00`);
      return paidAt >= start && paidAt <= end;
    })
    .reduce((sum, v) => sum + v.lastPaymentAmount, 0);
}

// Sums stock recorded as purchased in [start, end] — another cash-out figure
// distinct from COGS. Only ingredients with a `purchasedAt` timestamp count;
// entries saved before that field existed are excluded rather than guessed.
export function stockPurchasesInRange(
  ingredients: Ingredient[],
  start: Date,
  end: Date
): number {
  return ingredients
    .filter(
      (ing) =>
        ing.purchasedAt !== undefined &&
        ing.purchasedAt >= start.getTime() &&
        ing.purchasedAt <= end.getTime()
    )
    .reduce((sum, ing) => sum + ing.totalCost, 0);
}
