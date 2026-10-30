/**
 * Working name and store identifiers live in ../brand.cjs
 * so Expo's config loader and the app share one constant.
 */
export {
  ANDROID_PACKAGE,
  APP_NAME,
  APP_SCHEME,
  APP_SLUG,
  APP_TAGLINE,
  IOS_BUNDLE_ID,
} from '../brand.cjs';

/** RevenueCat entitlement id. Do not rename without updating the Worker webhook. */
export const PRO_ENTITLEMENT = 'pro';
export const PRO_MONTHLY_CENTS = 799;
export const PRO_ANNUAL_CENTS = 5900;
export const PRO_ANNUAL_SAVINGS_CENTS = PRO_MONTHLY_CENTS * 12 - PRO_ANNUAL_CENTS;
export const REVENUECAT_MONTHLY_PRODUCT = 'stack_pro_monthly';
export const REVENUECAT_ANNUAL_PRODUCT = 'stack_pro_annual';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';
export const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
export const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
export const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

export const DISCLAIMER =
  'Educational, not medical advice. Does not diagnose, treat, or prescribe.';

export const ASSOCIATION =
  'Associated with, not caused by';
