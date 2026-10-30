import { OUTCOME_LABELS, OUTCOME_METRICS as METRIC_KEYS, type OutcomeMetric } from '../domain/outcome';

export const SHARE_STACK_LABEL = 'Share stack';
export const DOCTOR_LINE = 'Ask your doctor before changing your supplements.';
export const NOT_ENOUGH_OUTCOME =
  'Not enough wearable data yet. A personal result compares 12 weeks before your stack started with 12 weeks after a 2 week settling in period.';
export const EXAMPLE_NOT_PERSONAL = 'Example data is not a personal result.';
export const EXAMPLE_CANNOT_SHARE = 'The example stack cannot be shared. Add what you take first.';
export const COPIED_CREDIT_FALLBACK = 'Copied from a Stack user';
export const SCORE_EXPLAINER = 'Out of 100, from daily doses and overlaps only. It is not a judgement of what the stack does.';
export const COHORT_EXPLAINER =
  'Each person compared 12 weeks before copying with 12 weeks after, on their own wearable. Groups under 10 people stay hidden.';

export const OUTCOME_METRICS: { key: OutcomeMetric; label: string }[] = METRIC_KEYS.map((key) => ({ key, label: OUTCOME_LABELS[key] }));
export type OutcomeMetricKey = OutcomeMetric;

/** Counts below 3 come back as null from the Worker and are not shown at all. */
export function copyCountLabel(count: number | null | undefined): string | null {
  if (count == null || count < 3) return null;
  return `Kept by ${count} people`;
}

export function creditLine(displayName: string | null | undefined): string {
  return displayName ? `Copied from ${displayName}` : COPIED_CREDIT_FALLBACK;
}

export function shareMessage(input: { stackName: string; score: number; url: string }): string {
  return `${input.stackName} scores ${input.score} out of 100 on Stack, from doses and overlaps. See the doses and copy it: ${input.url}`;
}
