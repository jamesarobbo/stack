import { describe, expect, it } from 'vitest';
import { currencyFromLocale, currencyOf, formatMoney, isCurrency, priceFieldLabel, spendSentence } from './money';

describe('money', () => {
  it('formats hundredths in the given currency and does not convert', () => {
    expect(formatMoney(17500, 'USD')).toBe('$175');
    expect(formatMoney(17500, 'GBP')).toBe('£175');
    expect(formatMoney(2700, 'EUR')).toBe('€27');
    expect(formatMoney(1299, 'USD')).toBe('$12.99');
    expect(formatMoney(-1200, 'GBP')).toBe('-£12');
    expect(formatMoney(0, 'AUD')).toBe('A$0');
  });

  it('treats a missing or unknown code as USD', () => {
    expect(currencyOf({})).toBe('USD');
    expect(currencyOf({ priceCurrency: 'GBP' })).toBe('GBP');
    expect(currencyOf({ priceCurrency: 'JPY' })).toBe('USD');
    expect(formatMoney(5000, 'JPY')).toBe('$50');
    expect(isCurrency('GBP')).toBe(true);
    expect(isCurrency('btc')).toBe(false);
  });

  it('reads a region from the locale and falls back to USD', () => {
    expect(currencyFromLocale('en-GB')).toBe('GBP');
    expect(currencyFromLocale('en_AU')).toBe('AUD');
    expect(currencyFromLocale('fr-FR')).toBe('EUR');
    expect(currencyFromLocale('en-CA')).toBe('CAD');
    expect(currencyFromLocale('en-NZ')).toBe('NZD');
    expect(currencyFromLocale('en')).toBe('USD');
    expect(currencyFromLocale('ja-JP')).toBe('USD');
  });

  it('joins monthly totals without adding them together', () => {
    expect(spendSentence([{ currency: 'GBP', monthlyCents: 17500 }])).toBe('£175 a month');
    expect(
      spendSentence([
        { currency: 'GBP', monthlyCents: 4000 },
        { currency: 'USD', monthlyCents: 1200 },
      ]),
    ).toBe('£40 a month and $12 a month');
    expect(spendSentence([{ currency: 'USD', monthlyCents: 0 }])).toBeNull();
  });

  it('names the price field in natural language', () => {
    expect(priceFieldLabel('USD')).toBe('Price in US dollars');
    expect(priceFieldLabel('GBP')).toBe('Price in British pounds');
    expect(priceFieldLabel('EUR')).toBe('Price in euros');
  });
});
