import type { ShiftEntry } from "./types";

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

const SHORT_DATE = { month: "short", day: "numeric" } as const;

export function getCurrentWeekLabel(now = new Date()): string {
  const start = startOfWeek(now);
  const end = endOfWeek(now);
  const startStr = start.toLocaleDateString("en-KE", SHORT_DATE);
  const endStr = end.toLocaleDateString("en-KE", { ...SHORT_DATE, year: "numeric" });
  return `Week of ${startStr} – ${endStr}`;
}

export function getCurrentMonthLabel(now = new Date()): string {
  return now.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
}

export function isOnShift(shifts: ShiftEntry[], staffId: string): boolean {
  return shifts.some((s) => s.staffId === staffId && s.clockOut === undefined);
}

export function openShift(
  shifts: ShiftEntry[],
  staffId: string
): ShiftEntry | undefined {
  return shifts.find((s) => s.staffId === staffId && s.clockOut === undefined);
}

export function daysWorkedThisWeek(
  shifts: ShiftEntry[],
  staffId: string,
  now = new Date()
): number {
  const start = startOfWeek(now);
  const end = endOfWeek(now);
  const days = new Set<string>();
  for (const s of shifts) {
    if (s.staffId !== staffId) continue;
    const clockInDate = new Date(s.clockIn);
    if (clockInDate >= start && clockInDate <= end) {
      days.add(clockInDate.toDateString());
    }
  }
  return days.size;
}
