import { formatUsd } from '../format';

export const EXPECTATION = 'Give each change a few weeks. Stack compares your before and after.';

export const GOALS = [
  { key: 'sleep', label: 'Sleep better', echo: 'For better sleep', because: 'sleep better' },
  { key: 'energy', label: 'More energy', echo: 'For more energy', because: 'have more energy' },
  { key: 'heart', label: 'Heart and metabolic health', echo: 'For heart and metabolic health', because: 'look after heart and metabolic health' },
  { key: 'focus', label: 'Focus', echo: 'For focus', because: 'focus more' },
  { key: 'recovery', label: 'Recovery', echo: 'For recovery', because: 'recover better' },
  { key: 'longevity', label: 'Longevity in general', echo: 'For longevity', because: 'think about longevity' },
  { key: 'unsure', label: "I'm not sure yet", echo: 'For a clearer look at your stack', because: 'were not sure yet' },
] as const;

export type GoalKey = (typeof GOALS)[number]['key'];

export const SPEND_OPTIONS = [
  { key: 'under50', label: 'Under $50' },
  { key: '50to100', label: '$50 to $100' },
  { key: '100to200', label: '$100 to $200' },
  { key: 'over200', label: 'Over $200' },
  { key: 'unsure', label: 'Not sure' },
] as const;

export type SpendKey = (typeof SPEND_OPTIONS)[number]['key'];

export const WEARABLE_CHOICES = ['healthkit', 'sample', 'skipped'] as const;
export type WearableChoice = (typeof WEARABLE_CHOICES)[number];

export function toggleGoal(current: readonly string[], key: string): string[] {
  if (key === 'unsure') return current.includes('unsure') ? [] : ['unsure'];
  const without = current.filter((item) => item !== 'unsure' && item !== key);
  if (current.includes(key)) return without;
  return [...without, key];
}

function knownGoals(keys: readonly string[]) {
  return GOALS.filter((goal) => goal.key !== 'unsure' && keys.includes(goal.key));
}

export function goalEcho(keys: readonly string[]): string {
  const specific = knownGoals(keys);
  if (specific.length === 0) return GOALS.find((goal) => goal.key === 'unsure')?.echo ?? 'For a clearer look at your stack';
  if (specific.length === 1) return specific[0]?.echo ?? 'For a clearer look at your stack';
  const lead = specific[0]?.echo ?? 'For your stack';
  const rest = specific.slice(1).map((goal) => goal.echo.replace(/^For /, ''));
  if (rest.length === 1) return `${lead} and ${rest[0]}`;
  return `${lead}, ${rest.slice(0, -1).join(', ')}, and ${rest[rest.length - 1]}`;
}

export function becauseLine(keys: readonly string[]): string {
  const specific = knownGoals(keys);
  if (specific.length === 0) return 'Because you said you were not sure yet.';
  const bits = specific.map((goal) => goal.because);
  if (bits.length === 1) return `Because you said you want to ${bits[0]}.`;
  if (bits.length === 2) return `Because you said you want to ${bits[0]} and ${bits[1]}.`;
  return `Because you said you want to ${bits.slice(0, -1).join(', ')}, and ${bits[bits.length - 1]}.`;
}

export function spendLine(key: string | null, monthlyCents: number): string | null {
  if (!key) return null;
  const option = SPEND_OPTIONS.find((item) => item.key === key);
  if (!option) return null;
  if (monthlyCents <= 0) {
    if (key === 'unsure') return 'You were not sure of the monthly spend. No prices are entered yet.';
    return `You put the monthly spend at ${option.label.toLowerCase()}. No prices are entered yet, so there is no total to compare.`;
  }
  const total = `${formatUsd(monthlyCents)} a month`;
  if (key === 'unsure') return `You were not sure of the monthly spend. The labels you entered add up to ${total}.`;
  return `You put the monthly spend at ${option.label.toLowerCase()}. The labels you entered add up to ${total}.`;
}

export function wearableLine(choice: string | null): string {
  if (choice === 'healthkit') return 'Apple Health is connected, so the before and after can use your own nights.';
  if (choice === 'sample') return 'This phone is using sample wearable data until a development build reads Apple Health.';
  if (choice === 'skipped') return 'You skipped a wearable. The before and after uses sample data until Apple Health is connected.';
  return 'A wearable is how Stack shows whether a change lines up with your own nights.';
}

