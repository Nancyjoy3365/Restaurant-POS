import type { ShiftEntry, Payment, StaffMember, LeaveRecord, IncentiveRecord } from "./types";
import { toDateKey } from "./utils";

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

function startOfDay(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(d: Date): Date {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

function startOfMonth(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfMonth(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  date.setHours(23, 59, 59, 999);
  return date;
}

// The same week/month window "Pay Period" already shows on the Staff &
// Payroll table, so Hours Worked / leave / incentives can all be scoped
// consistently with whatever's displayed there for a given staff member.
export function getPayPeriodRange(
  payType: StaffMember["payType"],
  now = new Date()
): { start: Date; end: Date } {
  return payType === "monthly"
    ? { start: startOfMonth(now), end: endOfMonth(now) }
    : { start: startOfWeek(now), end: endOfWeek(now) };
}

// Total hours actually clocked in a range — an open (not yet clocked out)
// shift counts up to `now`, so a currently-on-shift staff member's hours
// keep ticking up live rather than freezing until they clock out.
export function hoursWorkedInRange(
  shifts: ShiftEntry[],
  staffId: string,
  start: Date,
  end: Date,
  now = new Date()
): number {
  let totalMs = 0;
  for (const s of shifts) {
    if (s.staffId !== staffId) continue;
    const clockIn = new Date(s.clockIn);
    const clockOut = s.clockOut !== undefined ? new Date(s.clockOut) : now;
    const clampedStart = clockIn < start ? start : clockIn;
    const clampedEnd = clockOut > end ? end : clockOut;
    const ms = clampedEnd.getTime() - clampedStart.getTime();
    if (ms > 0) totalMs += ms;
  }
  return totalMs / (1000 * 60 * 60);
}

function isOnApprovedLeave(
  leaveRecords: LeaveRecord[],
  staffId: string,
  date: Date
): boolean {
  const key = toDateKey(date);
  return leaveRecords.some(
    (l) =>
      l.staffId === staffId &&
      l.status === "approved" &&
      key >= l.startDate &&
      key <= l.endDate
  );
}

// Counts calendar days in [start, end] covered by an approved leave record —
// only meaningful for monthly-rate staff, whose prorated pay otherwise
// assumes every day in the month was worked. Daily/commission staff already
// earn nothing on a day they don't clock in, so leave doesn't need to
// subtract anything extra for them.
export function approvedLeaveDaysInRange(
  leaveRecords: LeaveRecord[],
  staffId: string,
  start: Date,
  end: Date
): number {
  let count = 0;
  const cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor <= last) {
    if (isOnApprovedLeave(leaveRecords, staffId, cursor)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function incentiveTotalInRange(
  incentiveRecords: IncentiveRecord[],
  staffId: string,
  start: Date,
  end: Date
): number {
  return incentiveRecords
    .filter((r) => r.staffId === staffId)
    .filter((r) => r.dateGiven >= start.getTime() && r.dateGiven <= end.getTime())
    .reduce((sum, r) => sum + r.amount, 0);
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

export function salesThisWeek(
  payments: Payment[],
  waiterId: string,
  now = new Date()
): number {
  const start = startOfWeek(now);
  const end = endOfWeek(now);
  return payments
    .filter((p) => p.waiterId === waiterId)
    .filter((p) => {
      const paidDate = new Date(p.paidAt);
      return paidDate >= start && paidDate <= end;
    })
    .reduce((sum, p) => sum + p.amount, 0);
}

export function commissionEarned(
  payments: Payment[],
  staff: StaffMember,
  now = new Date()
): number {
  if (!staff.commissionType || staff.commissionValue === undefined) return 0;
  if (staff.commissionType === "percent_of_sales") {
    return Math.round(
      salesThisWeek(payments, staff.id, now) * (staff.commissionValue / 100)
    );
  }
  const start = startOfWeek(now);
  const end = endOfWeek(now);
  const orderCount = payments.filter(
    (p) =>
      p.waiterId === staff.id &&
      new Date(p.paidAt) >= start &&
      new Date(p.paidAt) <= end
  ).length;
  return orderCount * staff.commissionValue;
}

export function salesToday(
  payments: Payment[],
  waiterId: string,
  now = new Date()
): number {
  const start = startOfDay(now);
  const end = endOfDay(now);
  return payments
    .filter((p) => p.waiterId === waiterId)
    .filter((p) => {
      const paidDate = new Date(p.paidAt);
      return paidDate >= start && paidDate <= end;
    })
    .reduce((sum, p) => sum + p.amount, 0);
}

// A same-day slice of what each staff member is owed, for a daily P&L
// summary — daily-rate staff count only if they clocked in today, commission
// is computed on today's sales only, and a monthly salary is prorated across
// the days in the current month.
export function dailyPayout(
  staff: StaffMember,
  shifts: ShiftEntry[],
  payments: Payment[],
  now = new Date()
): number {
  if (staff.payType === "daily") {
    const start = startOfDay(now);
    const end = endOfDay(now);
    const workedToday = shifts.some(
      (s) =>
        s.staffId === staff.id &&
        new Date(s.clockIn) >= start &&
        new Date(s.clockIn) <= end
    );
    return workedToday ? staff.rate : 0;
  }
  if (staff.payType === "commission") {
    if (!staff.commissionType || staff.commissionValue === undefined) return 0;
    if (staff.commissionType === "percent_of_sales") {
      return Math.round(
        salesToday(payments, staff.id, now) * (staff.commissionValue / 100)
      );
    }
    const start = startOfDay(now);
    const end = endOfDay(now);
    const orderCount = payments.filter(
      (p) =>
        p.waiterId === staff.id &&
        new Date(p.paidAt) >= start &&
        new Date(p.paidAt) <= end
    ).length;
    return orderCount * staff.commissionValue;
  }
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  return Math.round(staff.rate / daysInMonth);
}

// Sums dailyPayout across every calendar day in [start, end] inclusive —
// lets the Financial Summary's date-range filter reuse the same per-pay-type
// rules (daily/commission/monthly) without re-deriving them for a range.
export function payoutForRange(
  staff: StaffMember,
  shifts: ShiftEntry[],
  payments: Payment[],
  start: Date,
  end: Date
): number {
  let total = 0;
  const cursor = startOfDay(start);
  const lastDay = startOfDay(end);
  while (cursor <= lastDay) {
    total += dailyPayout(staff, shifts, payments, cursor);
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
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
