export const SHARE_STACK_LABEL = 'Share stack';
export const DOCTOR_LINE = 'Ask your doctor before changing your supplements.';
export const NOT_ENOUGH_OUTCOME =
  'Not enough wearable data yet. A personal result needs 60 days before your stack started and 60 days after.';
export const EXAMPLE_NOT_PERSONAL = 'Example data is not a personal result.';
export const PEOPLE_LIKE_YOU_EMPTY = 'Not enough people like you yet.';
export const COPIED_CREDIT_FALLBACK = 'Copied from a Stack user.';

export const OUTCOME_METRICS = [
  { key: 'resting_hr_bpm', label: 'Resting heart rate' },
  { key: 'hrv_sdnn_ms', label: 'Heart rate variability' },
  { key: 'deep_sleep_min', label: 'Deep sleep' },
  { key: 'vo2_max', label: 'VO2 max' },
  { key: 'steps', label: 'Steps' },
  { key: 'active_energy_kcal', label: 'Active energy' },
] as const;

export type OutcomeMetricKey = (typeof OUTCOME_METRICS)[number]['key'];

export function copyCountLabel(count: number): string {
  if (count === 1) return 'Copied by 1 person';
  return `Copied by ${count} people`;
}
