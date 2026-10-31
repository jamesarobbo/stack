/** Short count for a card stat. 999 stays 999. 1,200 becomes 1.2k. 12,000 becomes 12k. */
export function compactCount(count: number): string {
  const n = Math.max(0, Math.round(count));
  if (n < 1000) return String(n);
  const units = [
    { value: 1_000_000_000, suffix: 'b' },
    { value: 1_000_000, suffix: 'm' },
    { value: 1_000, suffix: 'k' },
  ];
  const unit = units.find((item) => n >= item.value) ?? units[2]!;
  const scaled = n / unit.value;
  const rounded = scaled >= 10 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
  if (rounded >= 1000) return compactCount(rounded * unit.value);
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}${unit.suffix}`;
}

/** Full count for an accessibility label, with thousands separators. */
export function groupedCount(count: number): string {
  return Math.max(0, Math.round(count)).toLocaleString('en-US');
}

export function copiesLabel(count: number): string {
  return `${groupedCount(count)} copies`;
}

export function viewsLabel(count: number): string {
  return `${groupedCount(count)} views`;
}
