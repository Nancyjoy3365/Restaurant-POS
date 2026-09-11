import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import type { Ingredient } from "@/lib/types";

type IngredientRow = {
  IngredientId: number;
  Name: string;
  Packaging: string;
  Quantity: number;
  PiecesPerPackage: number;
  TotalCost: number;
  Unit: string;
  UnitAmount: number;
  ReorderThreshold: number;
  UnitCost: number;
  PurchasedAt: Date | null;
};

function toIngredient(row: IngredientRow): Ingredient {
  return {
    id: String(row.IngredientId),
    name: row.Name,
    packaging: row.Packaging,
    quantity: row.Quantity,
    piecesPerPackage: row.PiecesPerPackage,
    totalCost: row.TotalCost,
    unit: row.Unit,
    unitAmount: row.UnitAmount,
    reorderThreshold: row.ReorderThreshold,
    unitCost: row.UnitCost,
    purchasedAt: row.PurchasedAt ? row.PurchasedAt.getTime() : undefined,
  };
}

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query<IngredientRow>("SELECT * FROM dbo.Ingredient ORDER BY Name");
    return NextResponse.json(result.recordset.map(toIngredient));
  } catch (err) {
    console.error("GET /api/ingredients failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load ingredients", detail: message }, { status: 500 });
  }
}

// Creating an ingredient is also its opening stock purchase (see
// AddIngredientModal.tsx) — when `initialPurchase.vendorId` is given, both
// inserts happen in one transaction so a mid-flight failure can never leave
// an ingredient behind with no purchase recording what's owed for it.
export async function POST(request: Request) {
  const body = await request.json();
  const {
    name,
    packaging,
    quantity,
    piecesPerPackage,
    totalCost,
    unit,
    unitAmount,
    reorderThreshold,
    unitCost,
    purchasedAt,
    initialPurchase,
  } = body;

  if (!name || !packaging || !unit) {
    return NextResponse.json({ error: "name, packaging and unit are required" }, { status: 400 });
  }
  if (initialPurchase && !initialPurchase.vendorId) {
    return NextResponse.json({ error: "initialPurchase.vendorId is required" }, { status: 400 });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    const ingredientResult = await transaction
      .request()
      .input("Name", sql.NVarChar(150), name)
      .input("Packaging", sql.NVarChar(50), packaging)
      .input("Quantity", sql.Decimal(12, 2), quantity)
      .input("PiecesPerPackage", sql.Decimal(12, 2), piecesPerPackage)
      .input("TotalCost", sql.Decimal(12, 2), totalCost)
      .input("Unit", sql.NVarChar(20), unit)
      .input("UnitAmount", sql.Decimal(12, 2), unitAmount ?? 1)
      .input("ReorderThreshold", sql.Decimal(12, 2), reorderThreshold)
      .input("UnitCost", sql.Decimal(12, 4), unitCost)
      .input("PurchasedAt", sql.DateTime2(3), purchasedAt ? new Date(purchasedAt) : new Date())
      .output("IngredientId", sql.Int)
      .execute("usp_CreateIngredient");

    const ingredientId = ingredientResult.output.IngredientId as number;

    if (initialPurchase) {
      await transaction
        .request()
        .input("VendorId", sql.Int, Number(initialPurchase.vendorId))
        .input("IngredientId", sql.Int, ingredientId)
        .input("Quantity", sql.Decimal(12, 2), quantity)
        .input("UnitCost", sql.Decimal(12, 4), unitCost)
        .input("TotalCost", sql.Decimal(12, 2), totalCost)
        .output("StockPurchaseId", sql.Int)
        .execute("usp_RecordStockPurchase");
    }

    await transaction.commit();

    const ingredient: Ingredient = {
      id: String(ingredientId),
      name,
      packaging,
      quantity,
      piecesPerPackage,
      totalCost,
      unit,
      unitAmount: unitAmount ?? 1,
      reorderThreshold,
      unitCost,
      purchasedAt: purchasedAt ?? Date.now(),
    };
    return NextResponse.json(ingredient, { status: 201 });
  } catch (err) {
    await transaction.rollback().catch(() => {});
    console.error("POST /api/ingredients failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to create ingredient", detail: message }, { status: 500 });
  }
}
