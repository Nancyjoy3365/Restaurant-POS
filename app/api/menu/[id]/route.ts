import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const {
    name,
    category,
    price,
    veg,
    available,
    comboTag,
    comboComponents,
    aliases,
    spiceLevels,
    addOns,
    imageUrl,
    variantGroup,
    variantLabel,
    isPriority,
  } = body;

  if (!name || !category || !price) {
    return NextResponse.json({ error: "name, category and price are required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input("MenuItemId", sql.Int, Number(id))
      .input("Name", sql.NVarChar(150), name)
      .input("Category", sql.NVarChar(20), category)
      .input("Price", sql.Decimal(12, 2), price)
      .input("IsVeg", sql.Bit, Boolean(veg))
      .input("IsAvailable", sql.Bit, Boolean(available))
      .input("ComboTag", sql.NVarChar(100), comboTag ?? null)
      .input("ImageUrl", sql.NVarChar(500), imageUrl ?? null)
      .input("VariantGroup", sql.NVarChar(100), variantGroup ?? null)
      .input("VariantLabel", sql.NVarChar(100), variantLabel ?? null)
      .input("IsPriority", sql.Bit, Boolean(isPriority))
      .input("AliasesJson", sql.NVarChar(sql.MAX), aliases?.length ? JSON.stringify(aliases) : null)
      .input("SpiceLevelsJson", sql.NVarChar(sql.MAX), spiceLevels?.length ? JSON.stringify(spiceLevels) : null)
      .input("AddOnsJson", sql.NVarChar(sql.MAX), addOns?.length ? JSON.stringify(addOns) : null)
      .input(
        "ComboComponentsJson",
        sql.NVarChar(sql.MAX),
        comboComponents?.length ? JSON.stringify(comboComponents) : null
      )
      .execute("usp_UpdateMenuItem");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`PATCH /api/menu/${id} failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to update menu item", detail: message }, { status: 500 });
  }
}
