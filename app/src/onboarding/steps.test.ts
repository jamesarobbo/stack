import { describe, expect, it } from 'vitest';
import { ONBOARDING_STEPS, SUPPLEMENT_ENTRY, onboardingProgress, previousOnboardingStep } from './steps';

describe('onboarding steps', () => {
  it('keeps wearable, about you, and supplements as separate steps, in that order', () => {
    const keys = ONBOARDING_STEPS.map((step) => step.key);
    expect(keys.indexOf('wearable')).toBeGreaterThan(keys.indexOf('spend'));
    expect(keys.indexOf('about')).toBe(keys.indexOf('wearable') + 1);
    expect(keys.indexOf('supplements')).toBe(keys.indexOf('about') + 1);
    expect(keys).toEqual(['goal', 'spend', 'wearable', 'about', 'supplements', 'auditing', 'result', 'save', 'paywall']);
  });

  it('labels progress as 1 of N', () => {
    expect(onboardingProgress('goal')).toEqual({ current: 1, total: 9, label: '1 of 9', filled: 1 });
    expect(onboardingProgress('wearable').label).toBe('3 of 9');
    expect(onboardingProgress('about').label).toBe('4 of 9');
    expect(onboardingProgress('supplements').label).toBe('5 of 9');
    expect(onboardingProgress('paywall')).toEqual({ current: 9, total: 9, label: '9 of 9', filled: 9 });
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
