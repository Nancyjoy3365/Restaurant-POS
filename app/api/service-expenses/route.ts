import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import type { ServiceExpense } from "@/lib/types";

type ServiceExpenseRow = {
  ServiceExpenseId: number;
  Description: string;
  Category: string;
  Amount: number;
  IncurredAt: Date;
};

function toServiceExpense(row: ServiceExpenseRow): ServiceExpense {
  return {
    id: String(row.ServiceExpenseId),
    description: row.Description,
    category: row.Category,
    amount: row.Amount,
    incurredAt: row.IncurredAt.getTime(),
  };
}

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query<ServiceExpenseRow>("SELECT * FROM dbo.ServiceExpense ORDER BY IncurredAt DESC");
    return NextResponse.json(result.recordset.map(toServiceExpense));
  } catch (err) {
    console.error("GET /api/service-expenses failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load service expenses", detail: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { description, category, amount, incurredAt } = body;

  if (!description || !category || !amount) {
    return NextResponse.json({ error: "description, category and amount are required" }, { status: 400 });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("Description", sql.NVarChar(500), description)
      .input("Category", sql.NVarChar(100), category)
      .input("Amount", sql.Decimal(12, 2), amount)
      .input("IncurredAt", sql.DateTime2(3), new Date(incurredAt ?? Date.now()))
      .output("ServiceExpenseId", sql.Int)
      .execute("usp_CreateServiceExpense");

    const expense: ServiceExpense = {
      id: String(result.output.ServiceExpenseId),
      description,
      category,
      amount,
      incurredAt: incurredAt ?? Date.now(),
    };
    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error("POST /api/service-expenses failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to create service expense", detail: message }, { status: 500 });
  }
}
