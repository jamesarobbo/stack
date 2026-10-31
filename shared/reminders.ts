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
