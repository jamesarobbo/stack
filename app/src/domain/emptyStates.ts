export type FreshGap = 'products' | 'wearable';

export function freshStartGaps(input: { products: number; wearableSamples: number }): FreshGap[] {
  const gaps: FreshGap[] = [];
  if (input.products <= 0) gaps.push('products');
  if (input.wearableSamples <= 0) gaps.push('wearable');
  return gaps;
}

export const AUDIT_EMPTY = {
  title: 'Add supplements to audit',
  body: 'Audit looks for the same ingredient in more than one bottle, and for totals near a published upper limit. Add what you take and the price you paid.',
};

export const IMPACT_EMPTY = {
  productsTitle: 'Add a supplement first',
  productsBody: 'Impact compares the weeks before a start date with the weeks after. Add what you take, then connect a wearable.',
  wearableTitle: 'A few weeks of wearable data',
  wearableBody: 'Impact needs a few weeks of sleep, HRV, and resting heart rate from Apple Health. Nothing is filled in until those days are on this device.',
};

export const REPORT_EMPTY = {
  title: 'The monthly report needs more logged days',
  products: 'Add the supplements you take. The report lines each one up with keep, drop, or unclear once there is something to compare.',
  wearable: 'It also needs a few weeks of wearable data from Apple Health. This screen does not invent sleep, heart rate, or steps.',
};
