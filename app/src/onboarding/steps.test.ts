import { describe, expect, it } from 'vitest';
import { ONBOARDING_STEPS, SUPPLEMENT_ENTRY, onboardingProgress } from './steps';

describe('onboarding steps', () => {
  it('asks for a wearable before supplements', () => {
    expect(ONBOARDING_STEPS.map((step) => step.key)).toEqual(['wearable', 'supplements']);
    expect(ONBOARDING_STEPS.map((step) => step.path)).toEqual(['/onboarding', '/onboarding/supplements']);
  });

  it('marks the wearable screen as step 1 of 2', () => {
    expect(onboardingProgress('wearable')).toEqual({
      current: 1,
      total: 2,
      label: 'Step 1 of 2',
      filled: 1,
    });
  });

  it('marks the supplement screen as step 2 of 2', () => {
    expect(onboardingProgress('supplements')).toEqual({
      current: 2,
      total: 2,
      label: 'Step 2 of 2',
      filled: 2,
    });
  });

  it('offers NIH search, a barcode scan, and manual entry on the supplement step', () => {
    expect(SUPPLEMENT_ENTRY.map((entry) => entry.key)).toEqual(['search', 'scan', 'manual']);
    expect(SUPPLEMENT_ENTRY.find((entry) => entry.key === 'search')?.mode).toBe('search');
    expect(SUPPLEMENT_ENTRY.find((entry) => entry.key === 'scan')?.path).toBe('/scan');
    expect(SUPPLEMENT_ENTRY.find((entry) => entry.key === 'manual')?.mode).toBe('manual');
  });
});
