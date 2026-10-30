export function formatUsd(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  const withCommas = String(dollars).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (rem === 0) return `${sign}$${withCommas}`;
  return `${sign}$${withCommas}.${String(rem).padStart(2, '0')}`;
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
