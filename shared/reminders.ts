/** One daily reminder for the whole app. Nothing here suggests a dose or a time. */

export const DAILY_REMINDER_TEXT = 'Log what you took today';

/** Rows left from an earlier build. The app no longer creates these. */
export type Reminder = {
  id: string;
  productId: string;
  time: string;
  days: string;
};

export type IntakeLog = {
  id: string;
  productId: string;
  day: string;
  takenAt: string;
};

export function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export function shiftDay(day: string, by: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const value = new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1);
  value.setDate(value.getDate() + by);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatClock(time: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return time;
  let hour = Number(match[1]);
  const suffix = hour >= 12 ? 'pm' : 'am';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${match[2]} ${suffix}`;
}

/** Days with at least one taken tick. Today still open does not wipe the days before it. */
export function loggedStreak(logs: IntakeLog[], today: string): number {
  const days = new Set(logs.map((log) => log.day));
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let count = 0;
  for (let step = 0; step < 400; step += 1) {
    if (!days.has(cursor)) break;
    count += 1;
    cursor = shiftDay(cursor, -1);
  }
  return count;
}

export function streakLine(count: number): string | null {
  if (count <= 0) return null;
  if (count === 1) return '1 day logged in a row';
  return `${count} days logged in a row`;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Short weekday names, Sunday first. Sentence case, not tracked out. */
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function monthParts(day: string): { year: number; month: number; date: number } {
  const [year, month, date] = day.split('-').map(Number);
  return { year: year ?? 1970, month: month ?? 1, date: date ?? 1 };
}

export function monthTitle(year: number, month: number): string {
  return `${MONTHS[(month - 1 + 12) % 12]} ${year}`;
}

export function shiftMonth(year: number, month: number, by: number): { year: number; month: number } {
  const value = new Date(year, month - 1 + by, 1);
  return { year: value.getFullYear(), month: value.getMonth() + 1 };
}

/** False when the month is the current one or later. The calendar does not open the future. */
export function canAdvanceMonth(year: number, month: number, today: string): boolean {
  const parts = monthParts(today);
  return year < parts.year || (year === parts.year && month < parts.month);
}

export type MonthCell = { day: string | null };

/** Sunday-first cells for one month. Blank cells pad the first and last week. */
export function monthGrid(year: number, month: number): MonthCell[] {
  const first = new Date(year, month - 1, 1).getDay();
  const count = new Date(year, month, 0).getDate();
  const cells: MonthCell[] = [];
  for (let index = 0; index < first; index += 1) cells.push({ day: null });
  for (let date = 1; date <= count; date += 1) {
    cells.push({ day: `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}` });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null });
  return cells;
}

/** Only the device's local today can be logged. Past days are a read-only history. */
export function dayIsEditable(day: string, today: string): boolean {
  return day === today;
}

export function dayHeading(day: string, today: string): string {
  if (day === today) return 'Today';
  const parts = monthParts(day);
  const name = `${MONTHS[parts.month - 1]} ${parts.date}`;
  return parts.year === monthParts(today).year ? name : `${name}, ${parts.year}`;
}

export function dayAccessibilityLabel(day: string, today: string, logged: boolean): string {
  const parts = monthParts(day);
  const date = `${MONTHS[parts.month - 1]} ${parts.date}`;
  const when = day === today ? `Today, ${date}` : date;
  return logged ? `${when}, logged` : when;
}
