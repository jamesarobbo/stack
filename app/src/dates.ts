export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

export function formatIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const dt = parseIso(iso);
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatIso(dt);
}

export function dayNumber(iso: string): number {
  return Math.floor(parseIso(iso).getTime() / 86_400_000);
}

/** Calendar date in the device timezone. Tests pass an explicit ISO date instead. */
export function localToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Short US date, for example Oct 30, 2026. The value stays a calendar day, not a timestamp. */
export function formatUsDate(iso: string): string {
  return parseIso(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function localDateFromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function isoFromLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Start dates cannot be in the future. A bad value falls back to today. */
export function clampStartDate(iso: string, today = localToday()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return today;
  return iso > today ? today : iso;
}

export function monthLabel(iso: string): string {
  return parseIso(iso).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function sameMonth(iso: string, today: string): boolean {
  return iso.slice(0, 7) === today.slice(0, 7);
}

export function offsetFrom(today: string, iso: string): number {
  return dayNumber(iso) - dayNumber(today);
}
