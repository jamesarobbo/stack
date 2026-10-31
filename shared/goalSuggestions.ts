/**
 * Suggested Discover goals from ingredient and product names.
 * Evidence-leaning and explicit: a name maps to a goal only when it is listed here.
 * Magnesium glycinate maps to sleep. Other magnesium salts do not.
 * Creatine maps to recovery only.
 * The sharer confirms the chips. Nothing here lists a stack by itself.
 */

export const GOAL_ORDER = ['sleep', 'energy', 'heart', 'recovery', 'focus', 'longevity'] as const;
export type StackGoal = (typeof GOAL_ORDER)[number];

export type GoalSource = {
  name: string;
  ingredients?: { key?: string; name?: string }[];
};

const RULES: { goal: StackGoal; test: (text: string) => boolean }[] = [
  { goal: 'sleep', test: (text) => text.includes('magnesium glycinate') },
  { goal: 'sleep', test: (text) => /\bglycine\b/.test(text) },
  { goal: 'sleep', test: (text) => text.includes('theanine') },
  { goal: 'sleep', test: (text) => text.includes('apigenin') },
  { goal: 'sleep', test: (text) => text.includes('melatonin') },
  { goal: 'recovery', test: (text) => text.includes('creatine') },
  { goal: 'recovery', test: (text) => /\bprotein\b/.test(text) },
  { goal: 'recovery', test: (text) => text.includes('tart cherry') },
  { goal: 'recovery', test: (text) => text.includes('collagen') },
  { goal: 'longevity', test: (text) => /\bnmn\b/.test(text) },
  { goal: 'longevity', test: (text) => /\bnr\b/.test(text) || text.includes('nicotinamide riboside') },
  { goal: 'longevity', test: (text) => /\btmg\b/.test(text) || text.includes('trimethylglycine') },
  { goal: 'longevity', test: (text) => text.includes('resveratrol') },
  { goal: 'longevity', test: (text) => text.includes('spermidine') },
  { goal: 'longevity', test: (text) => text.includes('urolithin') },
  { goal: 'heart', test: (text) => /omega[-\s]?3|fish oil/.test(text) },
  { goal: 'heart', test: (text) => /coq\s?10|coenzyme q10/.test(text) },
  { goal: 'heart', test: (text) => /\bk2\b|vitamin k2|mk-?7/.test(text) },
  { goal: 'focus', test: (text) => text.includes('caffeine') },
  { goal: 'energy', test: (text) => /\bb12\b|vitamin b12|cobalamin/.test(text) },
  { goal: 'energy', test: (text) => text.includes('rhodiola') },
];

function hitsFor(product: GoalSource, goal: StackGoal): number {
  const rules = RULES.filter((rule) => rule.goal === goal);
  let hits = 0;
  const ingredients = product.ingredients ?? [];
  if (ingredients.length === 0) {
    const name = product.name.toLowerCase();
    if (rules.some((rule) => rule.test(name))) hits += 1;
    return hits;
  }
  for (const ingredient of ingredients) {
    const text = `${ingredient.key ?? ''} ${ingredient.name ?? ''}`.toLowerCase();
    if (rules.some((rule) => rule.test(text))) hits += 1;
  }
  if (hits === 0 && rules.some((rule) => rule.test(product.name.toLowerCase()))) hits += 1;
  return hits;
}

/** Up to 3 goals, most matching ingredients first. Ties follow GOAL_ORDER. */
export function suggestGoals(products: GoalSource[]): StackGoal[] {
  const counts = new Map<StackGoal, number>();
  for (const goal of GOAL_ORDER) counts.set(goal, 0);
  for (const product of products) {
    for (const goal of GOAL_ORDER) {
      counts.set(goal, (counts.get(goal) ?? 0) + hitsFor(product, goal));
    }
  }
  return GOAL_ORDER.filter((goal) => (counts.get(goal) ?? 0) > 0)
    .sort((a, b) => {
      const delta = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
      if (delta !== 0) return delta;
      return GOAL_ORDER.indexOf(a) - GOAL_ORDER.indexOf(b);
    })
    .slice(0, 3)
    .sort((a, b) => GOAL_ORDER.indexOf(a) - GOAL_ORDER.indexOf(b));
}

/** Short label for a Discover chip. Drops a trailing dose. */
export function shortProductName(name: string): string {
  const trimmed = name.trim();
  const cut = trimmed.replace(/\s+\d[\d,.]*.*$/u, '').trim();
  const base = cut || trimmed;
  return base.length > 22 ? `${base.slice(0, 21).trim()}\u2026` : base;
}

export type ChipTone = 'sleep' | 'heart' | 'recovery' | 'focus' | 'energy' | 'neutral';

/** Longevity names stay neutral. There is no extra hue for that group. */
export function chipTone(name: string): ChipTone {
  const text = name.toLowerCase();
  if (RULES.some((rule) => rule.goal === 'sleep' && rule.test(text))) return 'sleep';
  if (RULES.some((rule) => rule.goal === 'heart' && rule.test(text))) return 'heart';
  if (RULES.some((rule) => rule.goal === 'recovery' && rule.test(text))) return 'recovery';
  if (RULES.some((rule) => rule.goal === 'focus' && rule.test(text))) return 'focus';
  if (RULES.some((rule) => rule.goal === 'energy' && rule.test(text))) return 'energy';
  return 'neutral';
}
