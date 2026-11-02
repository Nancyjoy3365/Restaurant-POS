import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import type { StaffRole } from "@/lib/types";

export interface StaffDirectoryEntry {
  id: string;
  name: string;
  role: StaffRole;
  title?: string;
  onLeave: boolean;
}

// The only staff data shown before logging in: names and roles for the
// login screen's picker (with job title), plus whether each person is on approved leave
// today (Kenya time) for its confirm step. No pay, phone or leave details.
export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query<{ StaffId: number; Name: string; Role: StaffRole; Title: string | null; OnLeave: number }>(
      `SELECT s.StaffId, s.Name, s.Role, s.Title,
              CASE WHEN EXISTS (
                SELECT 1 FROM dbo.LeaveRecord l
                WHERE l.StaffId = s.StaffId AND l.Status = 'approved'
                  AND CAST(DATEADD(HOUR, 3, SYSUTCDATETIME()) AS DATE) BETWEEN l.StartDate AND l.EndDate
              ) THEN 1 ELSE 0 END AS OnLeave
       FROM dbo.Staff s WHERE s.IsActive = 1 ORDER BY s.Name`
    );
    const entries: StaffDirectoryEntry[] = result.recordset.map((row) => ({
      id: String(row.StaffId),
      name: row.Name,
      role: row.Role,
      title: row.Title ?? undefined,
      onLeave: row.OnLeave === 1,
    }));
    return NextResponse.json(entries);
  } catch (err) {
    console.error("GET /api/auth/staff-directory failed:", err);
    return NextResponse.json({ error: "Failed to load staff" }, { status: 500 });
  }
}
