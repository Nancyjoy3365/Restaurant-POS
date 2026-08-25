import type { Receipt, Recipe, Ingredient } from "./types";

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
