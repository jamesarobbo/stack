import { formatMoney } from '../../shared/money';

export { formatMoney };

/** Stack Pro prices are charged in US dollars. Supplement prices use formatMoney. */
export function formatUsd(cents: number): string {
  return formatMoney(cents, 'USD');
}

export function formatNumber(value: number, digits = 0): string {
  const n = digits === 0 ? Math.round(value) : Number(value.toFixed(digits));
  const [whole, frac] = String(n).split('.');
  const withCommas = (whole ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${withCommas}.${frac}` : withCommas;
}

export function formatMinutes(mins: number): string {
  const m = Math.round(mins);
  const h = Math.floor(Math.abs(m) / 60);
  const r = Math.abs(m) % 60;
  if (h <= 0) return `${r}m`;
  return `${h}h ${String(r).padStart(2, '0')}m`;
}

export function signed(value: number, suffix = ''): string {
  const rounded = Math.round(value);
  const arrow = rounded > 0 ? '+' : rounded < 0 ? '' : '';
  return `${arrow}${formatNumber(rounded)}${suffix}`;
}
