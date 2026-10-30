export const ONBOARDING_STEPS = [
  { key: 'goal', path: '/onboarding', title: 'What do you want your stack to do?' },
  { key: 'spend', path: '/onboarding/spend', title: 'Rough monthly supplement spend' },
  { key: 'wearable', path: '/onboarding/wearable', title: 'Choose a wearable' },
  { key: 'supplements', path: '/onboarding/supplements', title: 'Add your supplements' },
  { key: 'auditing', path: '/onboarding/auditing', title: 'Auditing your stack' },
  { key: 'result', path: '/onboarding/result', title: 'Your audit' },
  { key: 'save', path: '/onboarding/save', title: 'Save your stack and audit' },
  { key: 'paywall', path: '/paywall', title: 'Stack Pro' },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]['key'];

export const SUPPLEMENT_ENTRY = [
  {
    key: 'search',
    title: 'Search NIH labels',
    detail: 'Find a product by brand or name',
    path: '/add',
    mode: 'search',
  },
  {
    key: 'scan',
    title: 'Scan a barcode',
    detail: 'UPC or EAN, looked up in the NIH database',
    path: '/scan',
    mode: null,
  },
  {
    key: 'manual',
    title: 'Add manually',
    detail: 'Type the label, or pick a common ingredient',
    path: '/add',
    mode: 'manual',
  },
] as const;

export function onboardingProgress(key: OnboardingStepKey) {
  const index = ONBOARDING_STEPS.findIndex((step) => step.key === key);
  const total = ONBOARDING_STEPS.length;
  const current = index + 1;
  return {
    current,
    total,
    label: `${current} of ${total}`,
    filled: current,
  };
}

export function previousOnboardingStep(key: OnboardingStepKey) {
  const index = ONBOARDING_STEPS.findIndex((step) => step.key === key);
  if (index <= 0) return null;
  return ONBOARDING_STEPS[index - 1] ?? null;
}
