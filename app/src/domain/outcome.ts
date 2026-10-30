import {
  MAX_PERCENT,
  OUTCOME_LABELS,
  OUTCOME_METRICS,
  computeOutcome,
  type OutcomeFields,
  type OutcomeMetric,
  type OutcomeMiss,
  type OutcomeResult,
} from '../../../shared/outcome';
import type { SampleInput } from './types';

export { OUTCOME_LABELS, OUTCOME_METRICS, type OutcomeFields, type OutcomeMetric, type OutcomeMiss, type OutcomeResult };

/** Every outcome metric worked out on the phone. Results the Worker would reject are reported as misses. */
export function personalResults(input: {
  samples: SampleInput[];
  stackStart: string;
  device: string;
  today: string;
}): (OutcomeResult | OutcomeMiss)[] {
  return OUTCOME_METRICS.map((metric) => {
    const samples = input.samples.filter((sample) => sample.metric === metric).map((sample) => ({ date: sample.date, value: sample.value }));
    const result = computeOutcome({ metric, samples, stackStart: input.stackStart, device: input.device, asOf: input.today });
    if (result.eligible && Math.abs(result.percent) > MAX_PERCENT) {
      return { eligible: false, metric, reason: 'The change is too large to be a reliable reading.', readyOn: null };
    }
    return result;
  });
}

/** Only the fields the Worker accepts. Never samples. */
export function submittedFields(result: OutcomeResult): OutcomeFields {
  return {
    metric: result.metric,
    direction: result.direction,
    percent: result.percent,
    withinNormal: result.withinNormal,
    windowDays: result.windowDays,
    device: result.device,
  };
}

/** The earliest date any outcome becomes ready, for "Ready on" copy. */
export function earliestReady(results: (OutcomeResult | OutcomeMiss)[]): string | null {
  const dates = results.filter((item): item is OutcomeMiss => !item.eligible && item.readyOn != null).map((item) => item.readyOn as string);
  return dates.sort()[0] ?? null;
}

/** Big number for the result hero, for example "6%" with "lower". */
export function heroParts(result: Pick<OutcomeFields, 'direction' | 'percent' | 'withinNormal'>): { value: string; word: string } {
  if (result.withinNormal || result.direction === 'flat') return { value: 'Steady', word: 'within normal variation' };
  return { value: `${Math.abs(result.percent)}%`, word: result.direction === 'down' ? 'lower' : 'higher' };
}
