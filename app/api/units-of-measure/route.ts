import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import type { UnitOfMeasure } from "@/lib/types";

type UnitRow = {
  UnitId: number;
  Label: string;
};

function toUnit(row: UnitRow): UnitOfMeasure {
  return { id: String(row.UnitId), label: row.Label };
}

export async function GET() {
  try {
    const pool = await getPool();
    // UnitId order (not alphabetical) keeps the seeded defaults in their
    // original order, with anything custom landing after them in the
    // order it was added.
    const result = await pool.request().query<UnitRow>(
      "SELECT * FROM dbo.UnitOfMeasure ORDER BY UnitId"
    );
    return NextResponse.json(result.recordset.map(toUnit));
  } catch (err) {
    console.error("GET /api/units-of-measure failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load units of measure", detail: message }, { status: 500 });
  }
}

// Get-or-create by label (see usp_AddUnitOfMeasure) — retyping an existing
// unit just selects it instead of erroring or creating a duplicate.
export async function POST(request: Request) {
  const body = await request.json();
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }
  if (label.length > 20) {
    return NextResponse.json({ error: "label must be 20 characters or fewer" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("Label", sql.NVarChar(20), label)
      .output("UnitId", sql.Int)
      .execute("usp_AddUnitOfMeasure");
    const unitId = result.output.UnitId as number;
    return NextResponse.json({ id: String(unitId), label }, { status: 201 });
  } catch (err) {
    console.error("POST /api/units-of-measure failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to add unit of measure", detail: message }, { status: 500 });
  }
}
