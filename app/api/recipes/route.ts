import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import type { Recipe } from "@/lib/types";

type RecipeRow = { RecipeId: number; MenuItemId: number };
type RecipeComponentRow = { RecipeId: number; IngredientId: number; Qty: number };

// Recipe/RecipeComponent have no write path anywhere in the app yet (see
// database/01_schema.sql's comment) — this is read-only until a costing
// feature actually populates them.
export async function GET() {
  try {
    const pool = await getPool();
    const [recipes, components] = await Promise.all([
      pool.request().query<RecipeRow>("SELECT RecipeId, MenuItemId FROM dbo.Recipe"),
      pool.request().query<RecipeComponentRow>("SELECT RecipeId, IngredientId, Qty FROM dbo.RecipeComponent"),
    ]);

    const componentsByRecipe = new Map<number, { ingredientId: string; qty: number }[]>();
    for (const row of components.recordset) {
      const list = componentsByRecipe.get(row.RecipeId) ?? [];
      list.push({ ingredientId: String(row.IngredientId), qty: row.Qty });
      componentsByRecipe.set(row.RecipeId, list);
    }

    const result: Recipe[] = recipes.recordset.map((row) => ({
      id: String(row.RecipeId),
      menuItemId: String(row.MenuItemId),
      components: componentsByRecipe.get(row.RecipeId) ?? [],
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/recipes failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load recipes", detail: message }, { status: 500 });
  }
}
