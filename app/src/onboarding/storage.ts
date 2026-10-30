import { getSetting, setSetting } from '../settings';
import { GOALS, SPEND_OPTIONS, WEARABLE_CHOICES, type SpendKey, type WearableChoice } from './answers';

const GOAL_KEY = 'onboardingGoals';
const SPEND_KEY = 'onboardingSpend';
const WEARABLE_KEY = 'onboardingWearable';

export function readGoals(): string[] {
  const raw = getSetting(GOAL_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && GOALS.some((goal) => goal.key === item));
  } catch {
    return [];
  }
}

export function readSpend(): SpendKey | null {
  const raw = getSetting(SPEND_KEY);
  return SPEND_OPTIONS.some((item) => item.key === raw) ? (raw as SpendKey) : null;
}

export function readWearable(): WearableChoice | null {
  const raw = getSetting(WEARABLE_KEY);
  return WEARABLE_CHOICES.includes(raw as WearableChoice) ? (raw as WearableChoice) : null;
}

export async function writeGoals(keys: readonly string[]) {
  await setSetting(GOAL_KEY, JSON.stringify(keys));
}

export async function writeSpend(key: string) {
  await setSetting(SPEND_KEY, key);
}

export async function writeWearable(choice: WearableChoice) {
  await setSetting(WEARABLE_KEY, choice);
}
