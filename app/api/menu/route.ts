import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import type { MenuItem } from "@/lib/types";

type MenuItemRow = {
  MenuItemId: number;
  Name: string;
  Category: MenuItem["category"];
  Price: number;
  IsVeg: boolean;
  IsAvailable: boolean;
  ComboTag: string | null;
  ImageUrl: string | null;
  VariantGroup: string | null;
  VariantLabel: string | null;
  IsPriority: boolean;
};

async function fetchMenu(): Promise<MenuItem[]> {
  const pool = await getPool();
  const [items, aliases, spiceLevels, addOns, comboComponents] = await Promise.all([
    pool.request().query<MenuItemRow>("SELECT * FROM dbo.MenuItem ORDER BY Name"),
    pool.request().query<{ MenuItemId: number; Alias: string }>("SELECT MenuItemId, Alias FROM dbo.MenuItemAlias"),
    pool
      .request()
      .query<{ MenuItemId: number; Level: string }>(
        "SELECT MenuItemId, Level FROM dbo.MenuItemSpiceLevel ORDER BY MenuItemId, SortOrder"
      ),
    pool
      .request()
      .query<{ MenuItemId: number; Name: string; Price: number }>(
        "SELECT MenuItemId, Name, Price FROM dbo.MenuItemAddOn"
      ),
    pool
      .request()
      .query<{ MenuItemId: number; Name: string; Qty: string }>(
        "SELECT MenuItemId, Name, Qty FROM dbo.MenuItemComboComponent"
      ),
  ]);

  const aliasesByItem = new Map<number, string[]>();
  for (const row of aliases.recordset) {
    const list = aliasesByItem.get(row.MenuItemId) ?? [];
    list.push(row.Alias);
    aliasesByItem.set(row.MenuItemId, list);
  }
  const spiceLevelsByItem = new Map<number, string[]>();
  for (const row of spiceLevels.recordset) {
    const list = spiceLevelsByItem.get(row.MenuItemId) ?? [];
    list.push(row.Level);
    spiceLevelsByItem.set(row.MenuItemId, list);
  }
  const addOnsByItem = new Map<number, { name: string; price: number }[]>();
  for (const row of addOns.recordset) {
    const list = addOnsByItem.get(row.MenuItemId) ?? [];
    list.push({ name: row.Name, price: row.Price });
    addOnsByItem.set(row.MenuItemId, list);
  }
  const comboComponentsByItem = new Map<number, { name: string; qty: string }[]>();
  for (const row of comboComponents.recordset) {
    const list = comboComponentsByItem.get(row.MenuItemId) ?? [];
    list.push({ name: row.Name, qty: row.Qty });
    comboComponentsByItem.set(row.MenuItemId, list);
  }

  return items.recordset.map((row) => ({
    id: String(row.MenuItemId),
    name: row.Name,
    category: row.Category,
    price: row.Price,
    veg: row.IsVeg,
    available: row.IsAvailable,
    comboTag: row.ComboTag ?? undefined,
    comboComponents: comboComponentsByItem.get(row.MenuItemId),
    aliases: aliasesByItem.get(row.MenuItemId) ?? [],
    spiceLevels: spiceLevelsByItem.get(row.MenuItemId),
    addOns: addOnsByItem.get(row.MenuItemId),
    imageUrl: row.ImageUrl ?? undefined,
    variantGroup: row.VariantGroup ?? undefined,
    variantLabel: row.VariantLabel ?? undefined,
    isPriority: row.IsPriority || undefined,
  }));
}

export async function GET() {
  try {
    return NextResponse.json(await fetchMenu());
  } catch (err) {
    console.error("GET /api/menu failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load menu", detail: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const result = await pool
      .request()
      .input("Name", sql.NVarChar(150), name)
      .input("Category", sql.NVarChar(20), category)
      .input("Price", sql.Decimal(12, 2), price)
      .input("IsVeg", sql.Bit, Boolean(veg))
      .input("IsAvailable", sql.Bit, available ?? true)
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
      .output("MenuItemId", sql.Int)
      .execute("usp_CreateMenuItem");

    const menuItem: MenuItem = {
      id: String(result.output.MenuItemId),
      name,
      category,
      price,
      veg: Boolean(veg),
      available: available ?? true,
      comboTag: comboTag || undefined,
      comboComponents,
      aliases: aliases ?? [],
      spiceLevels,
      addOns,
      imageUrl: imageUrl || undefined,
      variantGroup: variantGroup || undefined,
      variantLabel: variantLabel || undefined,
      isPriority: isPriority || undefined,
    };
    return NextResponse.json(menuItem, { status: 201 });
  } catch (err) {
    console.error("POST /api/menu failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to create menu item", detail: message }, { status: 500 });
  }
}
