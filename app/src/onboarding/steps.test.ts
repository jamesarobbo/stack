import { describe, expect, it } from 'vitest';
import { ONBOARDING_STEPS, SUPPLEMENT_ENTRY, onboardingProgress, previousOnboardingStep } from './steps';

describe('onboarding steps', () => {
  it('keeps wearable and supplements as separate steps, in that order', () => {
    const keys = ONBOARDING_STEPS.map((step) => step.key);
    expect(keys.indexOf('wearable')).toBeGreaterThan(keys.indexOf('spend'));
    expect(keys.indexOf('supplements')).toBe(keys.indexOf('wearable') + 1);
    expect(keys).toEqual(['goal', 'spend', 'wearable', 'supplements', 'auditing', 'result', 'save', 'paywall']);
  });

  it('labels progress as 1 of N', () => {
    expect(onboardingProgress('goal')).toEqual({ current: 1, total: 8, label: '1 of 8', filled: 1 });
    expect(onboardingProgress('wearable').label).toBe('3 of 8');
    expect(onboardingProgress('supplements').label).toBe('4 of 8');
    expect(onboardingProgress('paywall')).toEqual({ current: 8, total: 8, label: '8 of 8', filled: 8 });
  });

  it('offers a back target for every step after the first', () => {
    expect(previousOnboardingStep('goal')).toBeNull();
    expect(previousOnboardingStep('wearable')?.key).toBe('spend');
    expect(previousOnboardingStep('paywall')?.path).toBe('/onboarding/save');
  });

  it('offers NIH search, a barcode scan, and manual entry on the supplement step', () => {
    expect(SUPPLEMENT_ENTRY.map((entry) => entry.key)).toEqual(['search', 'scan', 'manual']);
    expect(SUPPLEMENT_ENTRY.find((entry) => entry.key === 'search')?.mode).toBe('search');
    expect(SUPPLEMENT_ENTRY.find((entry) => entry.key === 'scan')?.path).toBe('/scan');
    expect(SUPPLEMENT_ENTRY.find((entry) => entry.key === 'manual')?.mode).toBe('manual');
  });
});
