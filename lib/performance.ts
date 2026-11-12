import type { MenuItem, Receipt, Ticket } from "./types";
import { isToday } from "./reports";

export function ordersCompletedToday(
  tickets: Ticket[],
  waiterId: string,
  now = new Date()
): number {
  return tickets.filter(
    (t) =>
      t.waiterId === waiterId &&
      t.status === "paid" &&
      t.closedAt !== undefined &&
      isToday(t.closedAt, now)
  ).length;
}

// Same as ordersCompletedToday, but for an arbitrary [start, end] — what the
// Performance Tracker's date-range filter uses instead of always "today".
export function ordersCompletedInRange(
  tickets: Ticket[],
  waiterId: string,
  start: Date,
  end: Date
): number {
  return tickets.filter(
    (t) =>
      t.waiterId === waiterId &&
      t.status === "paid" &&
      t.closedAt !== undefined &&
      t.closedAt >= start.getTime() &&
      t.closedAt <= end.getTime()
  ).length;
}

export interface PriorityProductTally {
  name: string;
  qty: number;
}

// Tallied from receipts (not live cart items), so only genuinely completed,
// paid sales count — nothing still sitting in an open cart, and nothing
// later voided, since a receipt is only ever generated at full settlement.
export function priorityUnitsSoldToday(
  receipts: Receipt[],
  tickets: Ticket[],
  menu: MenuItem[],
  waiterId: string,
  now = new Date()
): PriorityProductTally[] {
  const priorityMenuItemIds = new Set(
    menu.filter((m) => m.isPriority).map((m) => m.id)
  );
  if (priorityMenuItemIds.size === 0) return [];

  const ticketById = new Map(tickets.map((t) => [t.id, t]));
  const tallyByName = new Map<string, number>();

  for (const receipt of receipts) {
    if (!isToday(receipt.issuedAt, now)) continue;
    const ticket = ticketById.get(receipt.ticketId);
    if (!ticket || ticket.waiterId !== waiterId) continue;
    for (const line of receipt.items) {
      if (!priorityMenuItemIds.has(line.menuItemId)) continue;
      tallyByName.set(line.name, (tallyByName.get(line.name) ?? 0) + line.qty);
    }
  }

  return Array.from(tallyByName, ([name, qty]) => ({ name, qty }));
}

// Same as priorityUnitsSoldToday, but for an arbitrary [start, end] — what
// the Performance Tracker's date-range filter uses instead of always "today".
export function priorityUnitsSoldInRange(
  receipts: Receipt[],
  tickets: Ticket[],
  menu: MenuItem[],
  waiterId: string,
  start: Date,
  end: Date
): PriorityProductTally[] {
  const priorityMenuItemIds = new Set(
    menu.filter((m) => m.isPriority).map((m) => m.id)
  );
  if (priorityMenuItemIds.size === 0) return [];

  const ticketById = new Map(tickets.map((t) => [t.id, t]));
  const tallyByName = new Map<string, number>();

  for (const receipt of receipts) {
    if (receipt.issuedAt < start.getTime() || receipt.issuedAt > end.getTime())
      continue;
    const ticket = ticketById.get(receipt.ticketId);
    if (!ticket || ticket.waiterId !== waiterId) continue;
    for (const line of receipt.items) {
      if (!priorityMenuItemIds.has(line.menuItemId)) continue;
      tallyByName.set(line.name, (tallyByName.get(line.name) ?? 0) + line.qty);
    }
  }

  return Array.from(tallyByName, ([name, qty]) => ({ name, qty }));
}

export interface PriorityCategoryTally {
  category: string;
  qty: number;
}

// Same underlying data as priorityUnitsSoldInRange, but summed up by
// MenuItem.category (e.g. "Juice", "Water") instead of by exact item name —
// what a waiter's own Performance card shows, so they see a shape of what
// sold without the specific per-item breakdown that the admin-only
// per-item view (priorityUnitsSoldInRange) carries.
export function priorityUnitsSoldByCategoryInRange(
  receipts: Receipt[],
  tickets: Ticket[],
  menu: MenuItem[],
  waiterId: string,
  start: Date,
  end: Date
): PriorityCategoryTally[] {
  const priorityCategoryByMenuItemId = new Map(
    menu.filter((m) => m.isPriority).map((m) => [m.id, m.category])
  );
  if (priorityCategoryByMenuItemId.size === 0) return [];

  const ticketById = new Map(tickets.map((t) => [t.id, t]));
  const tallyByCategory = new Map<string, number>();

  for (const receipt of receipts) {
    if (receipt.issuedAt < start.getTime() || receipt.issuedAt > end.getTime())
      continue;
    const ticket = ticketById.get(receipt.ticketId);
    if (!ticket || ticket.waiterId !== waiterId) continue;
    for (const line of receipt.items) {
      const category = priorityCategoryByMenuItemId.get(line.menuItemId);
      if (!category) continue;
      tallyByCategory.set(category, (tallyByCategory.get(category) ?? 0) + line.qty);
    }
  }

  return Array.from(tallyByCategory, ([category, qty]) => ({ category, qty }));
}

// ---------------------------------------------------------------------------
// Week-on-week report
// ---------------------------------------------------------------------------

export interface WeekBucket {
  start: Date;
  end: Date;
  days: number; // 7 except possibly the last bucket, cut short by the range end
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function endOfDayBefore(d: Date): Date {
  return new Date(d.getTime() - 1);
}

// Splits [start, end] into 7-day blocks counted from `start` (so "This week"
// starting Monday gives Mon–Sun blocks, and a month gives days 1–7, 8–14, …).
// The final block is shorter when the range doesn't divide evenly.
export function weekBuckets(start: Date, end: Date): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  let cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor <= last) {
    const next = addDays(cursor, 7);
    const bucketEndDay = next > last ? addDays(last, 1) : next;
    const days = Math.round((bucketEndDay.getTime() - cursor.getTime()) / 86_400_000);
    buckets.push({ start: cursor, end: endOfDayBefore(bucketEndDay), days });
    cursor = next;
  }
  return buckets;
}

export interface WeekOnWeekRow {
  waiterId: string;
  name: string;
  weekly: number[]; // orders per bucket, same order as `buckets`
  total: number; // orders in the selected period
  previous: number; // orders in the same-length period right before it
  change: number; // total - previous
  changePct: number | null; // null when there's nothing to compare against
}

export interface WeekOnWeekReport {
  buckets: WeekBucket[];
  // Same number of days as the selected period, ending the day before it
  // starts — so "This week" compares to last week, and a part-way month
  // (1–8 Nov) compares to the 8 days before it, never a full vs half period.
  previousPeriod: WeekBucket;
  // True when the selected period runs up to today. Today isn't over yet, so
  // the previous period is cut at the same time of day (e.g. today until
  // 2pm vs yesterday until 2pm) — otherwise a full previous day always beats
  // a half-finished one and everybody looks like they dropped.
  inProgress: boolean;
  rows: WeekOnWeekRow[]; // sorted most-improved first
}

export function weekOnWeekReport(
  tickets: Ticket[],
  waiters: { id: string; name: string }[],
  start: Date,
  end: Date,
  now = new Date()
): WeekOnWeekReport {
  const buckets = weekBuckets(start, end);
  const periodStart = startOfDay(start);
  const periodDays = buckets.reduce((sum, b) => sum + b.days, 0) || 1;
  const inProgress = end.getTime() >= now.getTime();
  const previousPeriod: WeekBucket = {
    start: addDays(periodStart, -periodDays),
    end: inProgress ? addDays(now, -periodDays) : endOfDayBefore(periodStart),
    days: periodDays,
  };

  // One pass over paid tickets, grouped by waiter.
  const paidByWaiter = new Map<string, number[]>();
  for (const t of tickets) {
    if (t.status !== "paid" || t.closedAt === undefined) continue;
    const list = paidByWaiter.get(t.waiterId) ?? [];
    list.push(t.closedAt);
    paidByWaiter.set(t.waiterId, list);
  }
  const countIn = (times: number[], from: Date, to: Date) =>
    times.filter((x) => x >= from.getTime() && x <= to.getTime()).length;

  const rows: WeekOnWeekRow[] = waiters.map((w) => {
    const times = paidByWaiter.get(w.id) ?? [];
    const weekly = buckets.map((b) => countIn(times, b.start, b.end));
    const total = weekly.reduce((sum, n) => sum + n, 0);
    const previous = countIn(times, previousPeriod.start, previousPeriod.end);
    const change = total - previous;
    return {
      waiterId: w.id,
      name: w.name,
      weekly,
      total,
      previous,
      change,
      changePct: previous > 0 ? (change / previous) * 100 : null,
    };
  });

  rows.sort(
    (a, b) =>
      b.change - a.change ||
      (b.changePct ?? Infinity) - (a.changePct ?? Infinity) ||
      b.total - a.total ||
      a.name.localeCompare(b.name)
  );

  return { buckets, previousPeriod, inProgress, rows };
}

// ---------------------------------------------------------------------------
// Month / week growth report (Performance Tracker table).
//
// Weeks are anchored to the calendar month rather than to Mondays: days
// 1–7, 8–14, 15–21, and 22 to month-end (the last block absorbs the extra
// 1–3 days). "Current week" is the block containing the as-of date, counted
// only up to that date; "Last week" and "Previous week" are the two blocks
// before it, crossing into the previous month when needed.
// ---------------------------------------------------------------------------

export interface PeriodRange {
  start: Date;
  end: Date;
  /** Calendar days covered (partial for the current week / month to date). */
  days: number;
}

export interface MonthWeekRow {
  waiterId: string;
  name: string;
  lastMonth: number;
  monthToDate: number;
  momGrowth: number;
  momPct: number | null;
  previousWeek: number;
  lastWeek: number;
  currentWeek: number;
  wowGrowth: number;
  wowPct: number | null;
}

export interface MonthWeekReport {
  lastMonth: PeriodRange;
  monthToDate: PeriodRange;
  previousWeek: PeriodRange;
  lastWeek: PeriodRange;
  currentWeek: PeriodRange;
  rows: MonthWeekRow[];
  totals: Omit<MonthWeekRow, "waiterId" | "name">;
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** The month-anchored week block (1–7, 8–14, 15–21, 22–end) containing `d`. */
function monthWeekBlock(d: Date): { start: Date; end: Date } {
  const y = d.getFullYear();
  const m = d.getMonth();
  const idx = Math.min(Math.floor((d.getDate() - 1) / 7), 3);
  const startDay = idx * 7 + 1;
  const endDay = idx === 3 ? daysInMonth(y, m) : startDay + 6;
  return { start: new Date(y, m, startDay), end: endOfDay(new Date(y, m, endDay)) };
}

function fullRange(start: Date, end: Date): PeriodRange {
  const days = Math.round((startOfDay(end).getTime() - start.getTime()) / 86_400_000) + 1;
  return { start, end, days };
}

function pct(change: number, base: number): number | null {
  return base > 0 ? (change / base) * 100 : null;
}

export function monthWeekReport(
  tickets: Ticket[],
  waiters: { id: string; name: string }[],
  asOf: Date
): MonthWeekReport {
  const y = asOf.getFullYear();
  const m = asOf.getMonth();

  const monthToDate = fullRange(new Date(y, m, 1), asOf);
  const lastMonth = fullRange(new Date(y, m - 1, 1), endOfDay(new Date(y, m, 0)));

  const currentBlock = monthWeekBlock(asOf);
  const currentWeek = fullRange(currentBlock.start, asOf);
  const lastBlock = monthWeekBlock(addDays(currentBlock.start, -1));
  const lastWeek = fullRange(lastBlock.start, lastBlock.end);
  const prevBlock = monthWeekBlock(addDays(lastBlock.start, -1));
  const previousWeek = fullRange(prevBlock.start, prevBlock.end);

  const paidByWaiter = new Map<string, number[]>();
  for (const t of tickets) {
    if (t.status !== "paid" || t.closedAt === undefined) continue;
    const list = paidByWaiter.get(t.waiterId) ?? [];
    list.push(t.closedAt);
    paidByWaiter.set(t.waiterId, list);
  }
  const countIn = (times: number[], r: PeriodRange) =>
    times.filter((x) => x >= r.start.getTime() && x <= r.end.getTime()).length;

  const rows: MonthWeekRow[] = waiters.map((w) => {
    const times = paidByWaiter.get(w.id) ?? [];
    const lm = countIn(times, lastMonth);
    const mtd = countIn(times, monthToDate);
    const pw = countIn(times, previousWeek);
    const lw = countIn(times, lastWeek);
    const cw = countIn(times, currentWeek);
    return {
      waiterId: w.id,
      name: w.name,
      lastMonth: lm,
      monthToDate: mtd,
      momGrowth: mtd - lm,
      momPct: pct(mtd - lm, lm),
      previousWeek: pw,
      lastWeek: lw,
      currentWeek: cw,
      wowGrowth: cw - lw,
      wowPct: pct(cw - lw, lw),
    };
  });

  // Ranked by most improved week on week.
  rows.sort(
    (a, b) =>
      b.wowGrowth - a.wowGrowth ||
      b.currentWeek - a.currentWeek ||
      a.name.localeCompare(b.name)
  );

  const sum = (k: keyof MonthWeekRow) =>
    rows.reduce((s, r) => s + (r[k] as number), 0);
  const tLm = sum("lastMonth");
  const tMtd = sum("monthToDate");
  const tLw = sum("lastWeek");
  const tCw = sum("currentWeek");
  const totals = {
    lastMonth: tLm,
    monthToDate: tMtd,
    momGrowth: tMtd - tLm,
    momPct: pct(tMtd - tLm, tLm),
    previousWeek: sum("previousWeek"),
    lastWeek: tLw,
    currentWeek: tCw,
    wowGrowth: tCw - tLw,
    wowPct: pct(tCw - tLw, tLw),
  };

  return { lastMonth, monthToDate, previousWeek, lastWeek, currentWeek, rows, totals };
}
