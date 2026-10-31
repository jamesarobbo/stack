import { api, ApiError } from '../api';
import { localToday } from '../dates';
import type { DailyTotal, ScoreReason } from '../domain/auditScore';
import { copiedFrom, isOpenFoodFactsProduct, type SharedProduct } from '../domain/merge';
import { personalResults, submittedFields, type OutcomeFields, type OutcomeMetric, type OutcomeResult } from '../domain/outcome';
import type { ProductInput, SampleInput } from '../domain/types';
import { getSetting, setSetting } from '../settings';

export type SharedResultView = OutcomeFields & { label: string; line: string; disclaimer: string; framing: string };

export type ShareView = {
  slug: string;
  url: string;
  displayName: string | null;
  /** Lowercase public handle, without @. Null until the person chooses one. */
  username: string | null;
  stackName: string;
  goals: string[];
  products: SharedProduct[];
  auditScore: number;
  score: { score: number; summary: string; reasons: ScoreReason[]; totals: DailyTotal[] };
  result: SharedResultView | null;
  copyCount: number | null;
  viewCount: number | null;
  /** Monthly totals in the currencies they were entered in. Not converted. */
  spend?: { currency: string; monthlyCents: number }[];
  listed: boolean;
  version: number;
  createdOn: string;
  updatedOn: string | null;
  changes: string[];
  openFoodFacts: boolean;
};

export type ViewerState = {
  saved: boolean;
  blocked: boolean;
  copied: { copiedOn: string; current: boolean; outcomeConsent: boolean } | null;
  own: boolean;
};

export type PublicShare = ShareView & { viewer: ViewerState | null };
export type OwnShare = ShareView & { hidden: boolean };

export type CohortSlice = { key: string; label: string; people: string; direction: 'up' | 'down' | 'flat'; band: string; line: string };
export type CohortReport = {
  day: string;
  metrics: { metric: OutcomeMetric; label: string; slices: CohortSlice[] }[];
  disclaimer: string;
  viewerCohort: string | null;
};

export type CardComposition = { name: string; ofLimit: number | null };
export type LibraryItem = {
  slug: string;
  stackName: string;
  creatorName: string | null;
  goals: { key: string; label: string }[];
  auditScore: number;
  summary: string;
  productCount: number;
  composition: CardComposition[];
  productNames?: string[];
  outcomeLine?: string | null;
  copyCount: number | null;
  viewCount: number | null;
  saved: boolean;
  updatedOn: string | null;
  likeYou: { label: string; line: string } | null;
};
export type LibraryPage = { items: LibraryItem[]; nextOffset: number | null; note: string | null };

/** What the Worker publishes. Individual prices, notes, start dates, and catalogue ids stay on the phone. The monthly total is sent separately. */
export function sharePayloadProducts(products: ProductInput[]) {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand ?? '',
    servingsPerContainer: product.servingsPerContainer,
    servingsPerDay: product.servingsPerDay,
    source: isOpenFoodFactsProduct(product.catalogueId) ? 'off' : null,
    ingredients: product.ingredients.map((ingredient) => ({
      key: ingredient.key,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      ...(ingredient.family ? { family: ingredient.family } : {}),
      ...(ingredient.familyLabel ? { familyLabel: ingredient.familyLabel } : {}),
    })),
  }));
}

export function stackStartOf(products: ProductInput[]): string {
  return products.map((product) => product.startDate).sort()[0] ?? localToday();
}

export function healthDevice(): string {
  return getSetting('healthDevice') || 'Apple Health';
}

/** The creator's own results, worked out on this phone. Nothing here is sent until they publish one. */
export function creatorResults(products: ProductInput[], samples: SampleInput[], today = localToday()) {
  return personalResults({ samples, stackStart: stackStartOf(products), device: healthDevice(), today });
}

type CopyRow = { slug: string; stackName: string; copiedOn: string; outcomeConsent: boolean; resultsSent: boolean; readyOn: string };

/**
 * After the 12 week window closes, send the derived result for each stack the person copied and agreed to share results for.
 * The window starts on the server's copy date. Runs at most once a day.
 */
export async function submitCopierResults(token: string | null, samples: SampleInput[], today = localToday()): Promise<number> {
  if (!token || getSetting('healthSource') !== 'healthkit' || samples.length === 0) return 0;
  if (getSetting('copierResultsCheckedOn') === today) return 0;
  const { copies } = await api<{ copies: CopyRow[] }>('/v1/me/copies', { token });
  let sent = 0;
  for (const copy of copies) {
    if (!copy.outcomeConsent || copy.resultsSent || today < copy.readyOn) continue;
    const results = personalResults({ samples, stackStart: copy.copiedOn, device: healthDevice(), today }).filter(
      (item): item is OutcomeResult => item.eligible,
    );
    if (results.length === 0) continue;
    try {
      await api(`/v1/shares/${copy.slug}/outcome`, { method: 'POST', token, body: { results: results.map(submittedFields) } });
      sent += 1;
    } catch {
      // A share that was unshared or hidden simply drops out. The next day's check tries the rest again.
    }
  }
  await setSetting('copierResultsCheckedOn', today);
  return sent;
}

type PendingCopy = { slug: string; outcomeConsent: boolean };

function readPending(): PendingCopy[] {
  try {
    const parsed = JSON.parse(getSetting('pendingCopies') ?? '[]') as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is PendingCopy => !!item && typeof item === 'object' && typeof (item as PendingCopy).slug === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function rememberPendingCopy(copy: PendingCopy) {
  const list = readPending().filter((item) => item.slug !== copy.slug);
  await setSetting('pendingCopies', JSON.stringify([...list, copy].slice(-20)));
}

/** Records a copy that was written locally. Returns false when it is queued for later, for example before sign-in. */
export async function recordCopy(token: string | null, copy: PendingCopy): Promise<boolean> {
  if (!token) {
    await rememberPendingCopy(copy);
    return false;
  }
  try {
    await api(`/v1/shares/${copy.slug}/copy`, { method: 'POST', token, body: { outcomeConsent: copy.outcomeConsent } });
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 429) return false;
    await rememberPendingCopy(copy);
    return false;
  }
}

/** Sends copies made offline or before sign-in, once the products are still in the stack. */
export async function flushPendingCopies(token: string | null, products: ProductInput[]) {
  if (!token) return;
  const pending = readPending();
  if (pending.length === 0) return;
  const keep: PendingCopy[] = [];
  for (const copy of pending) {
    if (!products.some((product) => copiedFrom(product.catalogueId) === copy.slug)) continue;
    try {
      await api(`/v1/shares/${copy.slug}/copy`, { method: 'POST', token, body: { outcomeConsent: copy.outcomeConsent } });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status === 0 || error.status === 429 || error.status >= 500) keep.push(copy);
    }
  }
  await setSetting('pendingCopies', JSON.stringify(keep));
}

/**
 * First launch after installing from a share page. The page stored the slug against a hashed address for 2 hours.
 * Checked once per install.
 */
export async function claimDeferredLink(): Promise<string | null> {
  if (getSetting('linkClaimChecked') === '1') return null;
  await setSetting('linkClaimChecked', '1');
  try {
    const body = await api<{ slug: string | null }>('/v1/links/claim', { method: 'POST' });
    if (body.slug) await setSetting('pendingSlug', body.slug);
    return body.slug;
  } catch {
    return null;
  }
}

export async function takePendingSlug(): Promise<string | null> {
  const slug = getSetting('pendingSlug');
  if (!slug) return null;
  await setSetting('pendingSlug', '');
  return slug;
}
