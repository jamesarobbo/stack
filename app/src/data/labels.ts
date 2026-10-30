import { api } from '../api';

export type LabelHit = {
  dsldId: string;
  name: string;
  brand: string;
  keyIngredients: string[];
  offMarket: boolean;
};

export type RemoteLabel = {
  dsldId: string | null;
  name: string;
  brand: string;
  upc: string | null;
  servingSize: string;
  servingsPerContainer: number;
  servingsPerDay: number;
  servingsCounted: boolean;
  ingredients: { key: string; name: string; amount: number; unit: string; costWeight: number }[];
  source: 'dsld' | 'off' | 'user';
};

export const DSLD_URL = 'https://dsld.od.nih.gov/';
export const DSLD_ATTRIBUTION =
  'National Institutes of Health, Office of Dietary Supplements. Dietary Supplement Label Database, 2026. https://dsld.od.nih.gov/.';

export const OFF_URL = 'https://world.openfoodfacts.org/';
export const OFF_ATTRIBUTION = 'Product data from Open Food Facts, available under the ODbL';
export const OFF_DOSE_PROMPT = 'Check the doses on the label, or add any that are missing, before you save.';
export const BARCODE_NOT_FOUND = 'This barcode is not in the NIH database or Open Food Facts. Enter what the bottle says.';

export function searchLabels(query: string): Promise<{ hits: LabelHit[]; attribution: string }> {
  return api(`/v1/labels/search?q=${encodeURIComponent(query)}`);
}

export function getDsldLabel(id: string): Promise<{ label: RemoteLabel; attribution: string }> {
  return api(`/v1/labels/dsld/${encodeURIComponent(id)}`);
}

export function lookupUpc(code: string, token?: string | null): Promise<{ found: boolean; upc: string; label: RemoteLabel | null; attribution: string }> {
  return api(`/v1/labels/upc/${encodeURIComponent(code)}`, { token });
}

export function saveUserLabel(label: RemoteLabel, token: string): Promise<{ ok: boolean; label: RemoteLabel }> {
  const upc = label.upc ?? '';
  return api(`/v1/labels/upc/${encodeURIComponent(upc)}`, { method: 'PUT', token, body: label });
}
