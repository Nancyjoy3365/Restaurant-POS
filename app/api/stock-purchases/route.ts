import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import type { StockPurchase } from "@/lib/types";

type StockPurchaseRow = {
  StockPurchaseId: number;
  VendorId: number;
  IngredientId: number;
  Quantity: number;
  UnitCost: number;
  TotalCost: number;
  PurchasedAt: Date;
  IsPaid: boolean;
};

function toStockPurchase(row: StockPurchaseRow): StockPurchase {
  return {
    id: String(row.StockPurchaseId),
    vendorId: String(row.VendorId),
    ingredientId: String(row.IngredientId),
    quantity: row.Quantity,
    unitCost: row.UnitCost,
    totalCost: row.TotalCost,
    purchasedAt: row.PurchasedAt.getTime(),
    paid: row.IsPaid,
  };
}

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query<StockPurchaseRow>("SELECT * FROM dbo.StockPurchase ORDER BY PurchasedAt DESC");
    return NextResponse.json(result.recordset.map(toStockPurchase));
  } catch (err) {
    console.error("GET /api/stock-purchases failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load stock purchases", detail: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { vendorId, ingredientId, quantity, unitCost, totalCost } = body;

  if (!vendorId || !ingredientId || !quantity || !totalCost) {
    return NextResponse.json(
      { error: "vendorId, ingredientId, quantity and totalCost are required" },
      { status: 400 }
    );
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("VendorId", sql.Int, Number(vendorId))
      .input("IngredientId", sql.Int, Number(ingredientId))
      .input("Quantity", sql.Decimal(12, 2), quantity)
      .input("UnitCost", sql.Decimal(12, 4), unitCost)
      .input("TotalCost", sql.Decimal(12, 2), totalCost)
      .output("StockPurchaseId", sql.Int)
      .execute("usp_RecordStockPurchase");

    const stockPurchase: StockPurchase = {
      id: String(result.output.StockPurchaseId),
      vendorId: String(vendorId),
      ingredientId: String(ingredientId),
      quantity,
      unitCost,
      totalCost,
      purchasedAt: Date.now(),
      paid: false,
    };
    return NextResponse.json(stockPurchase, { status: 201 });
  } catch (err) {
    console.error("POST /api/stock-purchases failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to record stock purchase", detail: message }, { status: 500 });
  }
}
