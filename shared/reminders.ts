/** Times the person picked. Nothing here suggests a dose or a schedule. */

export const ALL_DAYS = '0123456';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export type Reminder = {
  id: string;
  productId: string;
  /** 24 hour clock, HH:mm. */
  time: string;
  /** Weekdays 0 (Sunday) through 6, sorted, no separators. */
  days: string;
};

export type IntakeLog = {
  id: string;
  productId: string;
  day: string;
  takenAt: string;
};

export type DueItem = {
  productId: string;
  name: string;
  time: string;
  taken: boolean;
};

export type ReminderSlot = {
  time: string;
  /** Null repeats every day. Otherwise 0 is Sunday. */
  weekday: number | null;
  names: string[];
  productIds: string[];
};

export function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export function normalizeDays(days: string): string {
  const found = new Set(days.replace(/[^0-6]/g, '').split('').filter(Boolean));
  return [...found].sort().join('');
}

export function everyDay(days: string): boolean {
  return normalizeDays(days) === ALL_DAYS;
}

export function weekdayIndex(day: string): number {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1).getDay();
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

export function daysLabel(days: string): string {
  const normalized = normalizeDays(days);
  if (normalized === ALL_DAYS) return 'Every day';
  if (!normalized) return 'No days';
  return normalized
    .split('')
    .map((digit) => DAY_SHORT[Number(digit)])
    .join(', ');
}

/** Plain notification title. One line, no emoji. */
export function reminderTitle(names: string[]): string {
  const clean = [...new Set(names.map((name) => name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  if (clean.length === 0) return 'Time for a supplement';
  if (clean.length === 1) return `Time for ${clean[0]}`;
  if (clean.length === 2) return `Time for ${clean[0]} and ${clean[1]}`;
  return `Time for ${clean[0]}, ${clean[1]} and ${clean.length - 2} more`;
}

export function dueOnDay(
  reminders: Reminder[],
  products: { id: string; name: string }[],
  logs: IntakeLog[],
  day: string,
): DueItem[] {
  const weekday = String(weekdayIndex(day));
  const names = new Map(products.map((product) => [product.id, product.name]));
  const taken = new Set(logs.filter((log) => log.day === day).map((log) => log.productId));
  const earliest = new Map<string, string>();
  for (const reminder of reminders) {
    if (!names.has(reminder.productId)) continue;
    if (!normalizeDays(reminder.days).includes(weekday)) continue;
    if (!isValidTime(reminder.time)) continue;
    const previous = earliest.get(reminder.productId);
    if (!previous || reminder.time < previous) earliest.set(reminder.productId, reminder.time);
  }
  return [...earliest.entries()]
    .map(([productId, time]) => ({
      productId,
      name: names.get(productId) ?? 'Supplement',
      time,
      taken: taken.has(productId),
    }))
    .sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name));
}

/** Complete days in a row. Today still open does not wipe the days before it. A day with nothing due is skipped. */
export function takenStreak(
  reminders: Reminder[],
  products: { id: string; name: string }[],
  logs: IntakeLog[],
  today: string,
): number {
  let cursor = today;
  const todayDue = dueOnDay(reminders, products, logs, today);
  if (todayDue.length > 0 && todayDue.some((item) => !item.taken)) cursor = shiftDay(today, -1);
  let count = 0;
  for (let step = 0; step < 400; step += 1) {
    const due = dueOnDay(reminders, products, logs, cursor);
    if (due.length === 0) {
      cursor = shiftDay(cursor, -1);
      continue;
    }
    if (due.some((item) => !item.taken)) break;
    count += 1;
    cursor = shiftDay(cursor, -1);
  }
  return count;
}

export function streakLine(count: number): string | null {
  if (count <= 0) return null;
  if (count === 1) return '1 day in a row';
  return `${count} days in a row`;
}

export function notificationSlots(reminders: Reminder[], products: { id: string; name: string }[]): ReminderSlot[] {
  const names = new Map(products.map((product) => [product.id, product.name]));
  const groups = new Map<string, { ids: Set<string>; names: Set<string> }>();
  for (const reminder of reminders) {
    const name = names.get(reminder.productId);
    if (!name || !isValidTime(reminder.time)) continue;
    const days = normalizeDays(reminder.days);
    for (const day of days) {
      const key = `${reminder.time}|${day}`;
      const group = groups.get(key) ?? { ids: new Set<string>(), names: new Set<string>() };
      group.ids.add(reminder.productId);
      group.names.add(name);
      groups.set(key, group);
    }
  }
  const byTime = new Map<string, Map<string, string[]>>();
  for (const [key, group] of groups) {
    const [time, day] = key.split('|');
    const signature = [...group.ids].sort().join(',');
    const bucket = byTime.get(time) ?? new Map<string, string[]>();
    const list = bucket.get(signature) ?? [];
    list.push(day);
    bucket.set(signature, list);
    byTime.set(time, bucket);
  }
  const slots: ReminderSlot[] = [];
  for (const [time, bucket] of byTime) {
    for (const [signature, days] of bucket) {
      const productIds = signature.split(',').filter(Boolean);
      const slotNames = productIds.map((id) => names.get(id) ?? '').filter(Boolean);
      const uniqueDays = [...new Set(days)].sort();
      if (uniqueDays.length === 7) {
        slots.push({ time, weekday: null, names: slotNames, productIds });
      } else {
        for (const day of uniqueDays) {
          slots.push({ time, weekday: Number(day), names: slotNames, productIds });
        }
      }
    }
  }
  return slots.sort((a, b) => a.time.localeCompare(b.time) || (a.weekday ?? -1) - (b.weekday ?? -1));
}
