import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import type { RestaurantSettings } from "@/lib/types";

type SettingsRow = {
  Name: string;
  Address: string;
  KraPin: string;
  Phone: string;
  TillNumber: string;
  VatRate: number;
  ReceiptWidth: RestaurantSettings["receiptWidth"];
};

function toSettings(row: SettingsRow): RestaurantSettings {
  return {
    name: row.Name,
    address: row.Address,
    kraPin: row.KraPin,
    phone: row.Phone,
    tillNumber: row.TillNumber,
    vatRate: row.VatRate,
    receiptWidth: row.ReceiptWidth,
  };
}

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query<SettingsRow>("SELECT Name, Address, KraPin, Phone, TillNumber, VatRate, ReceiptWidth FROM dbo.RestaurantSettings WHERE SettingsId = 1");
    const row = result.recordset[0];
    if (!row) return NextResponse.json({ error: "Restaurant settings not configured" }, { status: 404 });
    return NextResponse.json(toSettings(row));
  } catch (err) {
    console.error("GET /api/restaurant-settings failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load restaurant settings", detail: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { name, address, kraPin, phone, tillNumber, vatRate, receiptWidth } = body;

  if (!name || !address || !kraPin || !phone || !tillNumber || vatRate === undefined || !receiptWidth) {
    return NextResponse.json({ error: "All restaurant settings fields are required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input("Name", sql.NVarChar(200), name)
      .input("Address", sql.NVarChar(300), address)
      .input("KraPin", sql.NVarChar(50), kraPin)
      .input("Phone", sql.NVarChar(50), phone)
      .input("TillNumber", sql.NVarChar(50), tillNumber)
      .input("VatRate", sql.Decimal(5, 4), vatRate)
      .input("ReceiptWidth", sql.NVarChar(10), receiptWidth)
      .execute("usp_UpdateRestaurantSettings");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/restaurant-settings failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to update restaurant settings", detail: message }, { status: 500 });
  }
}
