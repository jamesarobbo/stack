export const ONBOARDING_STEPS = [
  { key: 'wearable', path: '/onboarding', title: 'Choose a wearable' },
  { key: 'supplements', path: '/onboarding/supplements', title: 'Add your supplements' },
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
    label: `Step ${current} of ${total}`,
    filled: current,
  };
}
