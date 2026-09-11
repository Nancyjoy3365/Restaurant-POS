import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { description, category, amount, incurredAt } = body;

  if (!description || !category || !amount) {
    return NextResponse.json({ error: "description, category and amount are required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input("ServiceExpenseId", sql.Int, Number(id))
      .input("Description", sql.NVarChar(500), description)
      .input("Category", sql.NVarChar(100), category)
      .input("Amount", sql.Decimal(12, 2), amount)
      .input("IncurredAt", sql.DateTime2(3), new Date(incurredAt))
      .execute("usp_UpdateServiceExpense");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`PATCH /api/service-expenses/${id} failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to update service expense", detail: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const pool = await getPool();
    await pool.request().input("ServiceExpenseId", sql.Int, Number(id)).execute("usp_DeleteServiceExpense");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/service-expenses/${id} failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to delete service expense", detail: message }, { status: 500 });
  }
}
