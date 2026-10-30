import { addDays, dayNumber } from '../dates';
import type { IngredientInput, ProductInput, SampleInput, TagInput } from '../domain/types';

/** Any 21 consecutive days cover each residue once, so window means stay exact. */
export const ZERO_NOISE = [4, -2, -2, 6, -6, 0, 3, -5, 1, 2, -4, 5, -3, 1, -1, 4, -6, 2, 0, 3, -2];
export const SMALL_NOISE = [1, -1, 0, 2, -2, 1, -1, 0, 1, -1, 2, -2, 0, 1, -1, 1, -1, 0, 2, -2, 0];

const HISTORY_DAYS = 220;

function noiseAt(iso: string, table: number[]): number {
  const index = ((dayNumber(iso) % table.length) + table.length) % table.length;
  return table[index] ?? 0;
}

function sleepBase(offset: number): number {
  if (offset >= -20 && offset <= 0) return 102;
  if (offset >= -62 && offset <= -42) return 91;
  if (offset >= -104 && offset <= -84) return 86;
  return 84;
}

function hrvBase(offset: number): number {
  return offset >= -20 && offset <= 0 ? 48 : 42;
}

function rhrBase(offset: number): number {
  return offset >= -20 && offset <= 0 ? 56 : 59;
}

function ingredient(partial: IngredientInput): IngredientInput {
  return partial;
}

function product(
  id: string,
  name: string,
  note: string,
  priceCents: number,
  startOffset: number,
  today: string,
  ingredients: IngredientInput[],
): ProductInput {
  return {
    id,
    name,
    brand: 'Northline',
    note,
    priceCents,
    servingsPerContainer: 30,
    servingsPerDay: 1,
    startDate: addDays(today, startOffset),
    catalogueId: id,
    ingredients,
  };
}

export function buildExample(today: string): {
  products: ProductInput[];
  samples: SampleInput[];
  tags: TagInput[];
} {
  const products: ProductInput[] = [
    product('example-nmn', 'NMN 1,000 mg', 'Daily', 4600, -104, today, [
      ingredient({ key: 'nmn', name: 'NMN', amount: 1000, unit: 'mg', costWeight: 1, summary: 'NMN 1,000 mg' }),
    ]),
    product('example-tmg', 'TMG 500 mg', 'Overlaps with NMN', 3200, -62, today, [
      ingredient({ key: 'tmg', name: 'TMG', amount: 500, unit: 'mg', costWeight: 17, summary: 'TMG 500 mg' }),
      ingredient({
        key: 'b-complex',
        name: 'B-complex (B6 / B12)',
        amount: 1,
        unit: 'blend',
        costWeight: 15,
        summary: 'TMG blend overlap',
        family: 'b-complex',
        familyLabel: 'B-complex (B6 / B12)',
      }),
      ingredient({ key: 'vitamin-b6', name: 'Vitamin B6', amount: 5, unit: 'mg', costWeight: 0 }),
      ingredient({ key: 'vitamin-b12', name: 'Vitamin B12', amount: 50, unit: 'mcg', costWeight: 0 }),
    ]),
    product('example-resveratrol', 'Resveratrol 500 mg', 'Evening', 3600, -150, today, [
      ingredient({
        key: 'resveratrol',
        name: 'Resveratrol',
        amount: 500,
        unit: 'mg',
        costWeight: 1,
        summary: 'Resveratrol 500 mg',
      }),
    ]),
    product('example-magnesium', 'Magnesium glycinate', '200 mg · bedtime', 1800, -20, today, [
      ingredient({
        key: 'magnesium',
        name: 'Magnesium',
        amount: 200,
        unit: 'mg',
        costWeight: 1,
        summary: 'Glycinate 200 mg',
        familyLabel: 'Magnesium',
      }),
    ]),
    product('example-multi', 'Multivitamin', 'Daily · includes Mg', 2900, -170, today, [
      ingredient({
        key: 'magnesium',
        name: 'Magnesium',
        amount: 50,
        unit: 'mg',
        costWeight: 12,
        summary: 'Multi ~50 mg',
        familyLabel: 'Magnesium',
      }),
      ingredient({
        key: 'b-complex',
        name: 'B-complex (B6 / B12)',
        amount: 1,
        unit: 'blend',
        costWeight: 16,
        summary: 'Multi',
        family: 'b-complex',
        familyLabel: 'B-complex (B6 / B12)',
      }),
      ingredient({ key: 'vitamin-b6', name: 'Vitamin B6', amount: 10, unit: 'mg', costWeight: 0 }),
      ingredient({ key: 'vitamin-b12', name: 'Vitamin B12', amount: 100, unit: 'mcg', costWeight: 0 }),
      ingredient({ key: 'trace-minerals', name: 'Trace minerals', amount: 1, unit: 'blend', costWeight: 1, summary: 'Trace minerals' }),
    ]),
    product('example-d3', 'Vitamin D3 4,000 IU', 'Morning with food', 1400, -190, today, [
      ingredient({
        key: 'vitamin-d',
        name: 'Vitamin D3',
        amount: 4000,
        unit: 'IU',
        costWeight: 1,
        summary: 'Vitamin D3 4,000 IU',
      }),
    ]),
  ];

  const samples: SampleInput[] = [];
  for (let offset = -HISTORY_DAYS; offset <= 0; offset += 1) {
    const date = addDays(today, offset);
    samples.push(
      { metric: 'deep_sleep_min', date, value: sleepBase(offset) + noiseAt(date, ZERO_NOISE) },
      { metric: 'hrv_sdnn_ms', date, value: hrvBase(offset) + noiseAt(date, SMALL_NOISE) },
      { metric: 'resting_hr_bpm', date, value: rhrBase(offset) + noiseAt(date, SMALL_NOISE) },
      { metric: 'vo2_max', date, value: 41 },
      { metric: 'steps', date, value: 8200 + noiseAt(date, ZERO_NOISE) * 40 },
      { metric: 'active_energy_kcal', date, value: 480 + noiseAt(date, ZERO_NOISE) * 3 },
    );
  }

  const tags: TagInput[] = [
    ...[-18, -12, -5].map((offset) => ({ date: addDays(today, offset), kind: 'alcohol' as const })),
    ...[-27, -24, -21, -16, -14, -11, -8, -3].map((offset) => ({
      date: addDays(today, offset),
      kind: 'hard_training' as const,
    })),
  ];
  for (let offset = -29; offset <= -23; offset += 1) {
    tags.push({ date: addDays(today, offset), kind: 'travel' });
  }

  return { products, samples, tags };
}
