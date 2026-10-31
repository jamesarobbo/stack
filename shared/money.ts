/** Prices are minor units (hundredths). v1 does not convert between currencies. */

export const CURRENCIES = [
  { code: 'USD', name: 'US dollar' },
  { code: 'GBP', name: 'British pound' },
  { code: 'EUR', name: 'Euro' },
  { code: 'CAD', name: 'Canadian dollar' },
  { code: 'AUD', name: 'Australian dollar' },
  { code: 'NZD', name: 'New Zealand dollar' },
  { code: 'CHF', name: 'Swiss franc' },
  { code: 'SEK', name: 'Swedish krona' },
  { code: 'NOK', name: 'Norwegian krone' },
  { code: 'DKK', name: 'Danish krone' },
  { code: 'SGD', name: 'Singapore dollar' },
  { code: 'HKD', name: 'Hong Kong dollar' },
  { code: 'INR', name: 'Indian rupee' },
  { code: 'MXN', name: 'Mexican peso' },
  { code: 'BRL', name: 'Brazilian real' },
  { code: 'ZAR', name: 'South African rand' },
  { code: 'PLN', name: 'Polish zloty' },
  { code: 'AED', name: 'UAE dirham' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

const CODES = new Set<string>(CURRENCIES.map((item) => item.code));

/** Region subtag to a currency we can store in hundredths. Unlisted regions fall back to USD. */
const REGION: Record<string, CurrencyCode> = {
  US: 'USD',
  GB: 'GBP',
  UK: 'GBP',
  IE: 'EUR',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  LU: 'EUR',
  SI: 'EUR',
  SK: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  MT: 'EUR',
  CY: 'EUR',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'NZD',
  CH: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  SG: 'SGD',
  HK: 'HKD',
  IN: 'INR',
  MX: 'MXN',
  BR: 'BRL',
  ZA: 'ZAR',
  PL: 'PLN',
  AE: 'AED',
};

export function isCurrency(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && CODES.has(value);
}

export function currencyName(code: string): string {
  return CURRENCIES.find((item) => item.code === code)?.name ?? 'US dollar';
}


/** Natural field label, e.g. "Price in US dollars". */
export function priceFieldLabel(code: string): string {
  const name = currencyName(code);
  const plural =
    name === 'Euro'
      ? 'euros'
      : name.endsWith('s')
        ? name
        : `${name}s`;
  return `Price in ${plural}`;
}

export function currencyOf(product: { priceCurrency?: string | null }): CurrencyCode {
  return isCurrency(product.priceCurrency) ? product.priceCurrency : 'USD';
}

/** Locale such as en-GB. A region we do not list, or a language with no region, is USD. */
export function currencyFromLocale(locale: string): CurrencyCode {
  const parts = locale.replace(/_/g, '-').split('-');
  for (const part of parts) {
    const region = part.toUpperCase();
    const currency = REGION[region];
    if (region.length === 2 && currency) return currency;
  }
  return 'USD';
}

/** Format hundredths with Intl. Whole amounts drop the trailing .00. No conversion. */
export function formatMoney(cents: number, currency: string = 'USD'): string {
  const code = isCurrency(currency) ? currency : 'USD';
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const whole = abs % 100 === 0;
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(abs / 100);
  return negative ? `-${formatted}` : formatted;
}

export type MoneyLine = { currency: CurrencyCode; monthlyCents: number; wastedCents: number };

/** Joins amounts that must not be added together. Whole currencies stay in their own symbols. */
export function joinMoney(amounts: { currency: string; cents: number }[]): string | null {
  const shown = amounts.filter((item) => item.cents > 0).map((item) => formatMoney(item.cents, item.currency));
  if (shown.length === 0) return null;
  if (shown.length === 1) return shown[0] ?? null;
  if (shown.length === 2) return `${shown[0]} and ${shown[1]}`;
  return `${shown.slice(0, -1).join(', ')}, and ${shown[shown.length - 1]}`;
}

export function spendSentence(lines: { currency: string; monthlyCents: number }[]): string | null {
  const shown = lines.filter((line) => line.monthlyCents > 0).map((line) => `${formatMoney(line.monthlyCents, line.currency)} a month`);
  if (shown.length === 0) return null;
  if (shown.length === 1) return shown[0] ?? null;
  if (shown.length === 2) return `${shown[0]} and ${shown[1]}`;
  return `${shown.slice(0, -1).join(', ')}, and ${shown[shown.length - 1]}`;
}
