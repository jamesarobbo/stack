export const AGE_RANGES = [
  { key: '18_29', label: '18 to 29' },
  { key: '30_39', label: '30 to 39' },
  { key: '40_49', label: '40 to 49' },
  { key: '50_59', label: '50 to 59' },
  { key: '60_plus', label: '60 plus' },
  { key: 'unspecified', label: 'Prefer not to say' },
] as const;

export const SEXES = [
  { key: 'female', label: 'Female' },
  { key: 'male', label: 'Male' },
  { key: 'unspecified', label: 'Prefer not to say' },
] as const;

export type AgeRange = (typeof AGE_RANGES)[number]['key'];
export type Sex = (typeof SEXES)[number]['key'];

export function isAgeRange(value: string | null | undefined): value is AgeRange {
  return AGE_RANGES.some((item) => item.key === value);
}

export function isSex(value: string | null | undefined): value is Sex {
  return SEXES.some((item) => item.key === value);
}

/** Full years on `today`. Under 18 is not a choice on the screen, so it returns null. */
export function ageRangeFromBirthDate(birthDate: string, today: string): AgeRange | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  if (!by || !bm || !bd || !ty || !tm || !td) return null;
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  if (age < 18 || age > 120) return null;
  if (age <= 29) return '18_29';
  if (age <= 39) return '30_39';
  if (age <= 49) return '40_49';
  if (age <= 59) return '50_59';
  return '60_plus';
}

export function prefillSex(value: string | null): Sex | null {
  if (value === 'female' || value === 'male') return value;
  return null;
}
