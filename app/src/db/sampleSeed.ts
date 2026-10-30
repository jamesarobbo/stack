export type SampleSeedAction = 'skip' | 'clear' | 'mark';

/**
 * Untouched installs stored the fictional stack with usingSampleData = 1.
 * A user edit flips that flag to 0. New installs have neither flag.
 * Clear only the untouched seed, once.
 */
export function sampleSeedAction(flags: {
  sampleSeedCleared: string | null;
  usingSampleData: string | null;
}): SampleSeedAction {
  if (flags.sampleSeedCleared === '1') return 'skip';
  if (flags.usingSampleData === '1') return 'clear';
  return 'mark';
}

export function shouldResetSeededName(action: SampleSeedAction, displayName: string | null): boolean {
  return action === 'clear' && displayName === 'Alex';
}

export function shouldClearExampleHealthSource(action: SampleSeedAction, healthSource: string | null): boolean {
  return action === 'clear' && healthSource === 'example';
}
