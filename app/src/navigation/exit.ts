/** Leave a pushed screen. A reload that opens the report with nothing underneath goes home. */
export function screenExit(canGoBack: boolean, fallback = '/(tabs)/stack') {
  if (canGoBack) return { type: 'back' as const };
  return { type: 'replace' as const, href: fallback };
}

export function reportHome(onboardingComplete: boolean) {
  return onboardingComplete ? '/(tabs)/stack' : '/onboarding';
}

/** Cold start on the monthly report must not stay there. Later visits are left to the back control. */
export function redirectOnLaunch(pathname: string, onboardingComplete: boolean): string | null {
  if (pathname !== '/report') return null;
  return reportHome(onboardingComplete);
}

export function applyScreenExit(
  canGoBack: boolean,
  goBack: () => void,
  replace: (href: string) => void,
  fallback = '/(tabs)/stack',
) {
  const exit = screenExit(canGoBack, fallback);
  if (exit.type === 'back') goBack();
  else replace(exit.href);
}
