import { currencyFromLocale, isCurrency, type CurrencyCode } from '../../shared/money';
import { getSetting, setSetting } from './settings';

/** Locale Intl already knows. expo-localization is a native module and is not installed. */
export function deviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  } catch {
    return 'en-US';
  }
}

export function getCurrency(): CurrencyCode {
  const stored = getSetting('currency');
  return isCurrency(stored) ? stored : 'USD';
}

/** Sets the currency from the device locale the first time, then leaves the saved choice alone. */
export async function ensureCurrency() {
  if (isCurrency(getSetting('currency'))) return;
  await setSetting('currency', currencyFromLocale(deviceLocale()));
}
