import { describe, expect, it } from 'vitest';
import { SMALL_NOISE, ZERO_NOISE, buildExample } from '../data/example';
import { addDays } from '../dates';
import { compareMetric, confoundersForWindow, signalStrength, verdictFor, windowRange } from './impact';
import { buildMonthlyReport, travelLabel } from './report';

const TODAY = '2026-10-30';

describe('windows', () => {
  it('uses 21 days before the start date and 21 days from it', () => {
    const range = windowRange('2026-10-10');
    expect(range.baselineStart).toBe('2026-09-19');
    expect(range.baselineEnd).toBe('2026-10-09');
    expect(range.afterStart).toBe('2026-10-10');
    expect(range.afterEnd).toBe('2026-10-30');
    expect(range.baselineStart <= range.baselineEnd).toBe(true);
  });

  it('ignores days outside the window and averages duplicates', () => {
    const comparison = compareMetric(
      [
        { metric: 'deep_sleep_min', date: '2026-09-01', value: 999 },
        { metric: 'deep_sleep_min', date: '2026-10-01', value: 100 },
        { metric: 'deep_sleep_min', date: '2026-10-10', value: 80 },
        { metric: 'deep_sleep_min', date: '2026-10-10', value: 100 },
        { metric: 'deep_sleep_min', date: '2026-11-01', value: 999 },
        { metric: 'hrv_sdnn_ms', date: '2026-10-10', value: 40 },
      ],
      'deep_sleep_min',
      '2026-10-10',
      21,
      21,
    );
    expect(comparison.after.series).toEqual([90]);
    expect(comparison.after.mean).toBe(90);
    expect(comparison.baseline.mean).toBe(100);
    expect(comparison.delta).toBe(-10);
  });
});

describe('example wearable windows', () => {
  const example = buildExample(TODAY);
  const magnesium = example.products.find((product) => product.id === 'example-magnesium');
  const nmn = example.products.find((product) => product.id === 'example-nmn');
  const tmg = example.products.find((product) => product.id === 'example-tmg');

  it('keeps the noise tables zero-sum so means do not drift', () => {
    expect(ZERO_NOISE).toHaveLength(21);
    expect(SMALL_NOISE).toHaveLength(21);
    expect(ZERO_NOISE.reduce((sum, value) => sum + value, 0)).toBe(0);
    expect(SMALL_NOISE.reduce((sum, value) => sum + value, 0)).toBe(0);
  });

  it('matches the magnesium before/after story', () => {
    expect(magnesium?.startDate).toBe(addDays(TODAY, -20));
    const sleep = compareMetric(example.samples, 'deep_sleep_min', magnesium!.startDate);
    const hrv = compareMetric(example.samples, 'hrv_sdnn_ms', magnesium!.startDate);
    const rhr = compareMetric(example.samples, 'resting_hr_bpm', magnesium!.startDate);
    expect(sleep.baseline.days).toBe(21);
    expect(sleep.after.days).toBe(21);
    expect(sleep.after.mean).toBe(102);
    expect(sleep.delta).toBe(18);
    expect(hrv.delta).toBe(6);
    expect(hrv.after.mean).toBe(48);
    expect(rhr.delta).toBe(-3);
    expect(rhr.after.mean).toBe(56);
  });

  it('gives NMN a small shift and TMG a weak one', () => {
    expect(compareMetric(example.samples, 'deep_sleep_min', nmn!.startDate).delta).toBe(2);
    expect(compareMetric(example.samples, 'deep_sleep_min', tmg!.startDate).delta).toBe(7);
  });

  it('does not treat the example alcohol tags as heavy for magnesium', () => {
    const summary = confoundersForWindow(example.samples, example.tags, magnesium!.startDate);
    expect(summary.alcoholDays).toBe(3);
    expect(summary.travelDays).toBe(0);
    expect(summary.trainingLoadSimilar).toBe(true);
    expect(summary.heavy).toBe(false);
  });
});

describe('verdicts', () => {
  const base = { daysBaseline: 21, daysAfter: 21 };

  it('keeps a strong shift when confounders are light', () => {
    const signal = signalStrength({ ...base, deepSleepDelta: 18, hrvDelta: 6, rhrDelta: -3 });
    expect(signal).toBe('strong');
    expect(verdictFor({ signal, wastedCents: 0, confounderHeavy: false })).toBe('keep');
  });

  it('stays unclear when a strong shift sits on a heavy confounder window', () => {
    const signal = signalStrength({ ...base, deepSleepDelta: 18, hrvDelta: 6, rhrDelta: -3 });
    expect(verdictFor({ signal, wastedCents: 0, confounderHeavy: true })).toBe('unclear');
  });

  it('drops a flat product that carries duplicate spend', () => {
    const signal = signalStrength({ ...base, deepSleepDelta: 0, hrvDelta: 0, rhrDelta: 0 });
    expect(signal).toBe('flat');
    expect(verdictFor({ signal, wastedCents: 1200, confounderHeavy: false })).toBe('drop');
  });

  it('leaves a weak shift unclear even when some spend overlaps', () => {
    const signal = signalStrength({ ...base, deepSleepDelta: 7, hrvDelta: 0, rhrDelta: 0 });
    expect(signal).toBe('weak');
    expect(verdictFor({ signal, wastedCents: 1500, confounderHeavy: false })).toBe('unclear');
  });

  it('is unclear without enough days', () => {
    expect(
      signalStrength({ daysBaseline: 10, daysAfter: 21, deepSleepDelta: 20, hrvDelta: 8, rhrDelta: -4 }),
    ).toBe('insufficient');
  });
});

describe('monthly report', () => {
  const example = buildExample(TODAY);
  const report = buildMonthlyReport({ today: TODAY, ...example });

  it('uses October 2026 and the example verdicts', () => {
    expect(report.month).toBe('October 2026');
    expect(report.summary).toBe(
      'Magnesium weeks showed lower resting heart rate; NMN weeks had no clear wearable shift.',
    );
    const verdicts = Object.fromEntries(report.supplements.map((item) => [item.productId, item.verdict]));
    expect(verdicts['example-magnesium']).toBe('keep');
    expect(verdicts['example-nmn']).toBe('unclear');
    expect(verdicts['example-tmg']).toBe('unclear');
    expect(verdicts['example-multi']).toBe('drop');
    expect(verdicts['example-resveratrol']).toBe('unclear');
    expect(verdicts['example-d3']).toBe('unclear');
  });

  it('counts the October tags and the overlap score', () => {
    expect(report.hardTrainingDays).toBe(8);
    expect(report.alcoholDays).toBe(3);
    expect(report.travelDays).toBe(7);
    expect(travelLabel(report.travelDays)).toBe('1 week');
    expect(report.savingsScore).toBe(85);
    expect(report.wastedCents).toBe(2700);
    expect(report.nearLimitCount).toBe(1);
    expect(report.dropCount).toBe(1);
  });
});
