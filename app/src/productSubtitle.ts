import { formatNumber } from './format';

/** Raw catalogue notes we never show on the stack list. */
export function isCatalogueNote(note: string | null | undefined): boolean {
  if (!note) return false;
  const trimmed = note.trim();
  return /^NIH DSLD\b/i.test(trimmed) || /^Barcode\b/i.test(trimmed) || /^Label serving:/i.test(trimmed);
}

/** Pull "3 Capsules" from catalogue or label notes. */
export function servingSizeFromNote(note: string | null | undefined): string | null {
  if (!note) return null;
  const match = note.match(/Serving size:\s*(.+?)\.?$/i) || note.match(/^Label serving:\s*(.+?)\.?$/i);
  if (!match) return null;
  const raw = match[1].trim();
  if (!raw || /^1 serving$/i.test(raw)) return null;
  return raw.replace(/\s+/g, ' ');
}

function lowerUnit(serving: string): string {
  return serving.replace(/\b(Capsules|Capsule|Tablets|Tablet|Softgels|Softgel|Gummies|Gummy|Scoops|Scoop|Drops|Drop|Packets|Packet|Pills|Pill)\b/gi, (word) =>
    word.toLowerCase(),
  );
}

function servingsLine(servingsPerDay: number, servingSize: string | null): string {
  if (servingSize && servingsPerDay === 1) return `${lowerUnit(servingSize)} a day`;
  if (!Number.isFinite(servingsPerDay) || servingsPerDay <= 0) {
    return servingSize ? `${lowerUnit(servingSize)} per serving` : 'Servings not set';
  }
  if (servingsPerDay === 1) return '1 a day';
  return `${formatNumber(servingsPerDay, servingsPerDay % 1 === 0 ? 0 : 1)} a day`;
}

/**
 * Human line under a product name on My Stack.
 * Brand and how often they take it. Catalogue ids stay off the row.
 */
export function productSubtitle(product: {
  brand: string | null;
  note: string | null;
  servingsPerDay: number;
}): string {
  const servingSize = servingSizeFromNote(product.note);
  const day = servingsLine(product.servingsPerDay, servingSize);
  const brand = product.brand?.trim();
  if (brand) return `${brand}, ${day}`;
  if (product.note && !isCatalogueNote(product.note)) return product.note;
  return day;
}

/** Quiet note stored with a product. Prefer brand and servings on the row instead. */
export function humanProductNote(input: {
  brand?: string | null;
  servingSize?: string | null;
}): string | null {
  const brand = input.brand?.trim();
  const serving = input.servingSize?.trim();
  if (brand && serving && serving !== '1 serving') return `${brand}. Label serving: ${serving}.`;
  if (brand) return brand;
  if (serving && serving !== '1 serving') return `Label serving: ${serving}.`;
  return null;
}
