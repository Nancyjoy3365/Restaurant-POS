import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  } = body;

  if (!name || !packaging || !unit) {
    return NextResponse.json({ error: "name, packaging and unit are required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input("IngredientId", sql.Int, Number(id))
      .input("Name", sql.NVarChar(150), name)
      .input("Packaging", sql.NVarChar(50), packaging)
      .input("Quantity", sql.Decimal(12, 2), quantity)
      .input("PiecesPerPackage", sql.Decimal(12, 2), piecesPerPackage)
      .input("TotalCost", sql.Decimal(12, 2), totalCost)
      .input("Unit", sql.NVarChar(20), unit)
      .input("UnitAmount", sql.Decimal(12, 2), unitAmount ?? 1)
      .input("ReorderThreshold", sql.Decimal(12, 2), reorderThreshold)
      .input("UnitCost", sql.Decimal(12, 4), unitCost)
      .input("PurchasedAt", sql.DateTime2(3), purchasedAt ? new Date(purchasedAt) : null)
      .execute("usp_UpdateIngredient");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`PATCH /api/ingredients/${id} failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to update ingredient", detail: message }, { status: 500 });
  }
}
