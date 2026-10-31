import { sameMonth } from '../dates';
import { auditStack, productWastedCents, savingsScore } from './audit';
import { compareMetric, confoundersForWindow, signalStrength, verdictFor } from './impact';
import type { ProductInput, SampleInput, TagInput, Verdict } from './types';

export type SupplementReport = {
  productId: string;
  name: string;
  verdict: Verdict;
  deepSleepDelta: number | null;
  hrvDelta: number | null;
  rhrDelta: number | null;
  wastedCents: number;
  daysAfter: number;
};

export type MonthlyReport = {
  month: string;
  summary: string;
  supplements: SupplementReport[];
  wastedCents: number;
  monthlySpendCents: number;
  savingsScore: number;
  nearLimitCount: number;
  overLimitCount: number;
  alcoholDays: number;
  travelDays: number;
  hardTrainingDays: number;
  dropCount: number;
};

export function buildMonthlyReport(input: {
  today: string;
  products: ProductInput[];
  samples: SampleInput[];
  tags: TagInput[];
}): MonthlyReport {
  const audit = auditStack(input.products);
  const supplements = input.products.map((product) => {
    const sleep = compareMetric(input.samples, 'deep_sleep_min', product.startDate);
    const hrv = compareMetric(input.samples, 'hrv_sdnn_ms', product.startDate);
    const rhr = compareMetric(input.samples, 'resting_hr_bpm', product.startDate);
    const confounders = confoundersForWindow(input.samples, input.tags, product.startDate);
    const signal = signalStrength({
      daysBaseline: sleep.baseline.days,
      daysAfter: sleep.after.days,
      deepSleepDelta: sleep.delta,
      hrvDelta: hrv.delta,
      rhrDelta: rhr.delta,
    });
    const wastedCents = productWastedCents(product.id, audit);
    return {
      productId: product.id,
      name: product.name,
      verdict: verdictFor({ signal, wastedCents, confounderHeavy: confounders.heavy }),
      deepSleepDelta: sleep.delta,
      hrvDelta: hrv.delta,
      rhrDelta: rhr.delta,
      wastedCents,
      daysAfter: sleep.after.days,
    };
  });

  const monthTags = input.tags.filter((tag) => sameMonth(tag.date, input.today));
  const count = (kind: TagInput['kind']) => new Set(monthTags.filter((tag) => tag.kind === kind).map((tag) => tag.date)).size;

  return {
    month: monthLabelFromToday(input.today),
    summary: reportSummary(supplements),
    supplements,
    wastedCents: audit.wastedCents,
    monthlySpendCents: audit.monthlySpendCents,
    savingsScore: savingsScore(audit.monthlySpendCents, audit.wastedCents),
    nearLimitCount: audit.limits.filter((limit) => limit.level === 'near').length,
    overLimitCount: audit.limits.filter((limit) => limit.level === 'over').length,
    alcoholDays: count('alcohol'),
    travelDays: count('travel'),
    hardTrainingDays: count('hard_training'),
    dropCount: supplements.filter((item) => item.verdict === 'drop').length,
  };
}

function monthLabelFromToday(today: string): string {
  const [y, m] = today.split('-').map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, 1));
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function reportSummary(items: SupplementReport[]): string {
  const quieter = items.find((item) => item.verdict === 'keep' && item.rhrDelta != null && item.rhrDelta <= -2);
  const flat = items.find(
    (item) => item.verdict === 'unclear' && (item.deepSleepDelta == null || Math.abs(item.deepSleepDelta) < 5),
  );
  const parts: string[] = [];
  if (quieter) parts.push(`${shortName(quieter.name)} weeks showed lower resting heart rate`);
  if (flat) parts.push(`${shortName(flat.name)} weeks had no clear wearable shift`);
  if (parts.length === 0) {
    return 'No clear wearable shift stood out this month. Association only, not proof of causation.';
  }
  return `${parts.join('; ')}.`;
}

function shortName(name: string): string {
  if (name.startsWith('NMN')) return 'NMN';
  if (name.startsWith('TMG')) return 'TMG';
  const first = name.split(' ')[0];
  return first || name;
}

export function travelLabel(days: number): string {
  if (days <= 0) return 'None';
  if (days >= 7) {
    const weeks = Math.max(1, Math.round(days / 7));
    return `${weeks} week${weeks === 1 ? '' : 's'}`;
  }
  return `${days} day${days === 1 ? '' : 's'}`;
}
