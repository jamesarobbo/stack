import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { verifyAppleIdentityToken, AuthError } from './apple';
import { isTestSignIn, returnsDevCode, testCode } from './auth';
import { hashCode, hashToken, randomCode, randomId, randomToken, safeEqual } from './crypto';
import {
  DSLD_ATTRIBUTION,
  DsldBudgetError,
  loadDsldLabel,
  loadSearch,
  loadUpc,
  parseUserLabel,
  upcDigits,
  type NormalisedLabel,
} from './dsld';
import { OFF_ATTRIBUTION, loadOffUpc, offUserAgent } from './off';
import { subscriptionFromEvent, subscriptionIsPro, type RevenueCatEvent } from './revenuecat';
import { parseIntake } from './intake';
import { blockCreator, copyCountLabel, intParam, refreshDailyStats, reportShare, searchLibrary, setSaved, syncSearchRow, type LibrarySegment } from './library';
import { ogImageVersion, ogSvg, publishedResult, renderOgPng, storyImageVersion, storySvg, type OgAssets } from './og';
import { spendSentence } from '../../shared/money';
import { addressKey, allow, clientAddress } from './rateLimit';
import { isCurrency } from '../../shared/money';
import { normalizeUsername, usernameHandle } from '../../shared/username';
import { setUsername, usernameAvailable, usernameRejection } from './username';
import { renderSharePage, type PageContext } from './sharePage';
import { recordShareView } from './shareViews';
import {
  cohortReport,
  currentShare,
  isSlug,
  listCopies,
  liveRow,
  publicShare,
  readProfile,
  recordCopy,
  revokeShare,
  saveProfile,
  setOutcomeConsent,
  submitOutcome,
  syncCopiesFromStack,
  upsertShare,
  viewerState,
} from './sharing';

export type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
  AUTH_PEPPER: string;
  APPLE_AUDIENCE: string;
  REVENUECAT_WEBHOOK_AUTH: string;
  DSLD_FETCH?: (input: string, init?: RequestInit) => Promise<Response>;
  OFF_FETCH?: (input: string, init?: RequestInit) => Promise<Response>;
  /** Contact address or URL placed in the Open Food Facts User-Agent. */
  CONTACT_EMAIL?: string;
  /** Comma separated test addresses on reserved domains that may sign in with TEST_SIGN_IN_CODE. */
  TEST_EMAILS?: string;
  /** Secret 6 digit code for TEST_EMAILS. Never returned by the API. */
  TEST_SIGN_IN_CODE?: string;
  /** Bearer token for the moderation queue. */
  ADMIN_TOKEN?: string;
  /** Numeric App Store id for the Smart App Banner and the store button. */
  APP_STORE_ID?: string;
  /** Apple developer team id for apple-app-site-association. */
  APPLE_TEAM_ID?: string;
  /** Origin used in share links and link previews, for example https://stack.example. Defaults to the request origin. */
  PUBLIC_BASE_URL?: string;
  /** Tests inject these instead of the bundled resvg wasm and fonts. */
  OG_ASSETS?: OgAssets;
};

type AppContext = Context<{ Bindings: Bindings }>;

type UserRow = { id: string; email: string | null; apple_sub: string | null };
type StackIngredient = {
  key: string;
  name: string;
  amount: number;
  unit: string;
  costWeight: number;
  summary?: string;
  family?: string;
  familyLabel?: string;
};
type StackProduct = {
  id: string;
  name: string;
  brand?: string | null;
  note?: string | null;
  priceCents: number;
  servingsPerContainer: number;
  servingsPerDay: number;
  startDate: string;
  catalogueId?: string | null;
  priceCurrency: string;
  ingredients: StackIngredient[];
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

app.get('/health', (c) => c.json({ ok: true, service: 'stack-api' }));

app.post('/v1/auth/email/start', async (c) => {
  const body = await readJson(c);
  const email = normalizeEmail(body.email);
  if (!email) return c.json({ error: 'Enter a valid email address.' }, 400);
  const pepper = c.env.AUTH_PEPPER;
  if (!pepper) return c.json({ error: 'Auth is not configured.' }, 500);
  if (!(await allowAddress(c, 'email_start', 20, 3600))) return tooMany(c);
  if (isTestSignIn(c.env, email)) return c.json({ ok: true });
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = await c.env.DB.prepare(
    'SELECT COUNT(*) AS n FROM email_codes WHERE email = ? AND created_at > ?',
  )
    .bind(email, since)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= 5) return c.json({ error: 'Too many codes. Try again later.' }, 429);

  const code = randomCode();
  const now = new Date();
  await c.env.DB.prepare(
    'INSERT INTO email_codes (id, email, code_hash, expires_at, consumed_at, created_at, attempts) VALUES (?, ?, ?, ?, NULL, ?, 0)',
  )
    .bind(randomId(), email, await hashCode(pepper, email, code), new Date(now.getTime() + 10 * 60 * 1000).toISOString(), now.toISOString())
    .run();

  if (returnsDevCode(c.env.ENVIRONMENT, c.req.url)) return c.json({ ok: true, devCode: code });
  return c.json({ ok: true });
});

app.post('/v1/auth/email/verify', async (c) => {
  const body = await readJson(c);
  const email = normalizeEmail(body.email);
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!email || !/^\d{6}$/.test(code)) return c.json({ error: 'Enter the 6-digit code.' }, 400);
  const pepper = c.env.AUTH_PEPPER;
  if (!pepper) return c.json({ error: 'Auth is not configured.' }, 500);
  if (!(await allowAddress(c, 'email_verify', 30, 3600))) return tooMany(c);
  if (!(await allow(c.env.DB, `verify:${await addressKey(pepper, email)}`, 10, 900))) return tooMany(c);

  if (isTestSignIn(c.env, email)) {
    const expected = testCode(c.env.TEST_SIGN_IN_CODE) ?? '';
    if (!safeEqual(code, expected)) return c.json({ error: 'That code is not valid.' }, 401);
    const user = await findOrCreateUser(c.env.DB, { email });
    const session = await createSession(c.env.DB, user.id);
    return c.json({ token: session.token, user: publicUser(user) });
  }

  const row = await c.env.DB.prepare(
    `SELECT id, code_hash, attempts FROM email_codes
     WHERE email = ? AND consumed_at IS NULL AND expires_at > ?
     ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(email, new Date().toISOString())
    .first<{ id: string; code_hash: string; attempts: number }>();
  const expected = await hashCode(pepper, email, code);
  const matches = row ? safeEqual(row.code_hash, expected) : false;
  if (!row || row.attempts >= 5 || !matches) {
    if (row) await c.env.DB.prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE id = ?').bind(row.id).run();
    return c.json({ error: 'That code is not valid.' }, 401);
  }
  await c.env.DB.prepare('UPDATE email_codes SET consumed_at = ? WHERE id = ?').bind(new Date().toISOString(), row.id).run();
  const user = await findOrCreateUser(c.env.DB, { email });
  const session = await createSession(c.env.DB, user.id);
  return c.json({ token: session.token, user: publicUser(user) });
});

app.post('/v1/auth/apple', async (c) => {
  const body = await readJson(c);
  const identityToken = typeof body.identityToken === 'string' ? body.identityToken : '';
  const rawNonce = typeof body.rawNonce === 'string' ? body.rawNonce : '';
  if (!identityToken || !rawNonce) return c.json({ error: 'Missing Apple token.' }, 400);
  if (!c.env.APPLE_AUDIENCE) return c.json({ error: 'Apple sign-in is not configured.' }, 500);
  if (!(await allowAddress(c, 'apple', 30, 3600))) return tooMany(c);
  try {
    const apple = await verifyAppleIdentityToken(identityToken, rawNonce, { audience: c.env.APPLE_AUDIENCE });
    const user = await findOrCreateUser(c.env.DB, { appleSub: apple.sub, email: apple.email });
    const session = await createSession(c.env.DB, user.id);
    return c.json({ token: session.token, user: publicUser(user) });
  } catch (error) {
    if (error instanceof AuthError) return c.json({ error: error.message }, 401);
    return c.json({ error: 'Apple token could not be verified.' }, 401);
  }
});

app.post('/v1/auth/signout', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  const header = c.req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await hashToken(token)).run();
  }
  return c.json({ ok: true });
});

app.get('/v1/me', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  const subscription = await c.env.DB.prepare(
    'SELECT status, expires_at, product_id, store FROM subscriptions WHERE user_id = ?',
  )
    .bind(user.id)
    .first<{ status: string; expires_at: string | null; product_id: string | null; store: string | null }>();
  const profile = await readProfile(c.env.DB, user.id);
  return c.json({
    user: publicUser(user),
    pro: subscriptionIsPro(subscription),
    subscription,
    profile: {
      ageRange: profile?.age_range ?? null,
      sex: profile?.sex ?? null,
      displayName: profile?.display_name ?? null,
      username: profile?.username ?? null,
      currency: profile?.currency ?? null,
    },
  });
});

app.put('/v1/sync/stack', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  const body = await readJson(c);
  if ('healthSamples' in body || 'samples' in body || 'heartRate' in body) {
    return c.json({ error: 'Health data stays on device and is not synced.' }, 400);
  }
  const products = parseProducts(body.products);
  if (!products) return c.json({ error: 'Stack payload was not valid.' }, 400);
  const payload = JSON.stringify({ products });
  if (payload.length > 200_000) return c.json({ error: 'Stack payload is too large.' }, 413);
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO synced_stacks (user_id, payload, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
  )
    .bind(user.id, payload, now)
    .run();
  await syncCopiesFromStack(c.env.DB, user.id, products.map((product) => product.catalogueId));
  return c.json({ ok: true, updatedAt: now });
});

app.put('/v1/sync/intake', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  const parsed = parseIntake(await readJson(c));
  if (!parsed) return c.json({ error: 'Intake payload was not valid.' }, 400);
  const statements = [
    ...parsed.logs.map((log) =>
      c.env.DB.prepare(
        `INSERT INTO intake_logs (id, user_id, product_id, day, taken_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, product_id, day) DO UPDATE SET taken_at = excluded.taken_at, id = excluded.id`,
      ).bind(log.id, user.id, log.productId, log.day, log.takenAt),
    ),
    ...parsed.removed.map((item) =>
      c.env.DB.prepare('DELETE FROM intake_logs WHERE user_id = ? AND product_id = ? AND day = ?').bind(user.id, item.productId, item.day),
    ),
  ];
  if (statements.length > 0) await c.env.DB.batch(statements);
  return c.json({ ok: true });
});

app.get('/v1/sync/intake', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  const since = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const rows = await c.env.DB.prepare(
    'SELECT id, product_id, day, taken_at FROM intake_logs WHERE user_id = ? AND day >= ? ORDER BY day DESC LIMIT 500',
  )
    .bind(user.id, since)
    .all<{ id: string; product_id: string; day: string; taken_at: string }>();
  return c.json({
    logs: rows.results.map((row) => ({ id: row.id, productId: row.product_id, day: row.day, takenAt: row.taken_at })),
  });
});

app.get('/v1/sync/stack', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  const row = await c.env.DB.prepare('SELECT payload, updated_at FROM synced_stacks WHERE user_id = ?')
    .bind(user.id)
    .first<{ payload: string; updated_at: string }>();
  if (!row) return c.json({ products: [], updatedAt: null });
  const parsed = JSON.parse(row.payload) as { products?: StackProduct[] };
  return c.json({ products: parsed.products ?? [], updatedAt: row.updated_at });
});

app.get('/v1/labels/search', async (c) => {
  const query = c.req.query('q') ?? '';
  if (query.trim().length < 2) return c.json({ error: 'Enter at least 2 characters.' }, 400);
  try {
    const hits = await loadSearch(c.env.DB, dsldFetcher(c.env), query);
    return c.json({ hits, attribution: DSLD_ATTRIBUTION });
  } catch (error) {
    return labelError(c, error);
  }
});

app.get('/v1/labels/upc/:code', async (c) => {
  const digits = upcDigits(c.req.param('code'));
  if (digits.length < 8 || digits.length > 14) return c.json({ error: 'That barcode is not a UPC or EAN.' }, 400);
  const user = await userFromRequest(c);
  if (user) {
    const saved = await c.env.DB.prepare('SELECT payload FROM contributed_labels WHERE user_id = ? AND upc = ?')
      .bind(user.id, digits)
      .first<{ payload: string }>();
    if (saved) {
      const label = JSON.parse(saved.payload) as NormalisedLabel;
      return c.json({ found: true, upc: digits, label, attribution: DSLD_ATTRIBUTION });
    }
  }
  try {
    const result = await loadUpc(c.env.DB, dsldFetcher(c.env), digits);
    if (result.found && result.label) return c.json({ ...result, attribution: DSLD_ATTRIBUTION });
  } catch {
    // NIH missed or could not be reached. Try Open Food Facts, then manual entry.
  }
  try {
    const off = await loadOffUpc(c.env.DB, offFetcher(c.env), digits, offUserAgent(c.env.CONTACT_EMAIL));
    if (off.found && off.label) return c.json({ ...off, attribution: OFF_ATTRIBUTION });
  } catch {
    // A timeout or a bad response is a miss. The app opens manual entry.
  }
  return c.json({ found: false, upc: digits, label: null, attribution: DSLD_ATTRIBUTION });
});

app.get('/v1/labels/dsld/:id', async (c) => {
  const id = c.req.param('id');
  if (!/^\d{1,12}$/.test(id)) return c.json({ error: 'Unknown label.' }, 400);
  try {
    const label = await loadDsldLabel(c.env.DB, dsldFetcher(c.env), id);
    if (!label) return c.json({ error: 'That label could not be read.' }, 404);
    return c.json({ label, attribution: DSLD_ATTRIBUTION });
  } catch (error) {
    return labelError(c, error);
  }
});

app.put('/v1/labels/upc/:code', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  const digits = upcDigits(c.req.param('code'));
  if (digits.length < 8 || digits.length > 14) return c.json({ error: 'That barcode is not a UPC or EAN.' }, 400);
  const label = parseUserLabel(await readJson(c), digits);
  if (!label) return c.json({ error: 'The product needs a name, servings, and at least one ingredient.' }, 400);
  const payload = JSON.stringify(label);
  if (payload.length > 20_000) return c.json({ error: 'That product is too large.' }, 413);
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO contributed_labels (user_id, upc, payload, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, upc) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
  )
    .bind(user.id, digits, payload, now)
    .run();
  return c.json({ ok: true, label });
});

app.post('/v1/webhooks/revenuecat', async (c) => {
  const secret = c.env.REVENUECAT_WEBHOOK_AUTH;
  if (!secret) return c.json({ error: 'Webhook is not configured.' }, 503);
  const header = c.req.header('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!presented || !safeEqual(presented, secret)) return c.json({ error: 'Unauthorized.' }, 401);
  const body = (await c.req.json().catch(() => null)) as { event?: RevenueCatEvent } | null;
  const event = body?.event;
  if (!event) return c.json({ error: 'Missing event.' }, 400);
  const write = subscriptionFromEvent(event);
  if (!write) return c.json({ ok: true, ignored: true });
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO subscriptions (user_id, entitlement, status, product_id, store, expires_at, revenuecat_app_user_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       entitlement = excluded.entitlement,
       status = excluded.status,
       product_id = excluded.product_id,
       store = excluded.store,
       expires_at = excluded.expires_at,
       revenuecat_app_user_id = excluded.revenuecat_app_user_id,
       updated_at = excluded.updated_at`,
  )
    .bind(write.userId, write.entitlement, write.status, write.productId, write.store, write.expiresAt, write.revenuecatAppUserId, now)
    .run();
  return c.json({ ok: true, status: write.status });
});

app.delete('/v1/account', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  const db = c.env.DB;
  const mine = 'SELECT id FROM shares WHERE user_id = ?';
  const statements = [
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    db.prepare('DELETE FROM subscriptions WHERE user_id = ?').bind(user.id),
    db.prepare('DELETE FROM synced_stacks WHERE user_id = ?').bind(user.id),
    db.prepare('DELETE FROM intake_logs WHERE user_id = ?').bind(user.id),
    db.prepare('DELETE FROM contributed_labels WHERE user_id = ?').bind(user.id),
    db.prepare(`DELETE FROM share_search WHERE share_id IN (${mine})`).bind(user.id),
    db.prepare(`DELETE FROM share_saves WHERE user_id = ? OR share_id IN (${mine})`).bind(user.id, user.id),
    db.prepare(`DELETE FROM share_reports WHERE user_id = ? OR share_id IN (${mine})`).bind(user.id, user.id),
    db.prepare(`DELETE FROM share_copies WHERE user_id = ? OR share_id IN (${mine})`).bind(user.id, user.id),
    db.prepare(`DELETE FROM copier_outcomes WHERE user_id = ? OR share_id IN (${mine})`).bind(user.id, user.id),
    db.prepare(`DELETE FROM share_cohort_cache WHERE share_id IN (${mine})`).bind(user.id),
    db.prepare(`DELETE FROM share_versions WHERE share_id IN (${mine})`).bind(user.id),
    db.prepare(`DELETE FROM share_images WHERE share_id IN (${mine})`).bind(user.id),
    db.prepare('DELETE FROM user_blocks WHERE user_id = ? OR blocked_user_id = ?').bind(user.id, user.id),
    db.prepare('DELETE FROM shares WHERE user_id = ?').bind(user.id),
  ];
  if (user.email) statements.push(db.prepare('DELETE FROM email_codes WHERE email = ?').bind(user.email));
  statements.push(db.prepare('DELETE FROM users WHERE id = ?').bind(user.id));
  await db.batch(statements);
  return c.json({ ok: true });
});

app.get('/v1/usernames/available', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  if (!(await allow(c.env.DB, `username-check:${user.id}`, 40, 60))) return tooMany(c);
  const result = await usernameAvailable(c.env.DB, c.req.query('name') ?? '', user.id);
  return c.json(result);
});

app.put('/v1/me/username', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  const body = await readJson(c);
  const raw = typeof body.username === 'string' ? body.username : '';
  const rejection = usernameRejection(raw);
  if (rejection) return c.json({ error: rejection }, 400);
  const profile = await readProfile(c.env.DB, user.id);
  const next = normalizeUsername(raw);
  if (profile?.username === next) return c.json({ username: next });
  if (!(await allow(c.env.DB, `username:${user.id}`, 5, 86_400))) return tooMany(c);
  const saved = await setUsername(c.env.DB, user.id, raw);
  if (!saved.ok) return c.json({ error: saved.error }, 400);
  return c.json({ username: saved.username });
});

app.put('/v1/me/profile', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  const saved = await saveProfile(c.env.DB, user.id, await readJson(c));
  if (!saved.ok) return c.json({ error: saved.error }, 400);
  return c.json({ profile: saved.profile });
});

app.post('/v1/outcomes/preview', (c) =>
  c.json({ error: 'Personal results are worked out on your phone. Wearable samples are not sent to the server.' }, 410),
);

app.post('/v1/shares', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  if (!(await allow(c.env.DB, `publish:${user.id}`, 30, 3600))) return tooMany(c);
  const saved = await upsertShare(c.env.DB, user.id, await readJson(c));
  if (!saved.ok) return c.json({ error: saved.error }, 400);
  return c.json({ ...saved.share, url: shareUrl(c, saved.share.slug) });
});

app.get('/v1/shares/current', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  const share = await currentShare(c.env.DB, user.id);
  return c.json({ share: share ? { ...share, url: shareUrl(c, share.slug) } : null });
});

app.delete('/v1/shares/current', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  await revokeShare(c.env.DB, user.id);
  return c.json({ ok: true });
});

app.get('/v1/me/copies', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  return c.json({ copies: await listCopies(c.env.DB, user.id) });
});

app.delete('/v1/me/blocks', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  await c.env.DB.prepare('DELETE FROM user_blocks WHERE user_id = ?').bind(user.id).run();
  return c.json({ ok: true });
});

app.get('/v1/shares/:slug', async (c) => {
  const found = await publicShare(c.env.DB, c.req.param('slug'));
  if (!found) return c.json({ error: 'This stack is no longer shared.' }, 404);
  const user = await userFromRequest(c);
  await trackShareView(c, found.row, user?.id ?? null);
  const viewer = user ? await viewerState(c.env.DB, found.row, user.id) : null;
  return c.json({ ...found.view, url: shareUrl(c, found.view.slug), viewer });
});

app.post('/v1/shares/:slug/copy', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  if (!(await allow(c.env.DB, `copy:${user.id}`, 30, 3600))) return tooMany(c);
  if (!(await allowAddress(c, 'copy', 60, 3600))) return tooMany(c);
  const copied = await recordCopy(c.env.DB, c.req.param('slug'), user.id, await readJson(c));
  if (!copied.ok) return c.json({ error: copied.error }, copied.status as 400);
  return c.json({ copiedOn: copied.copiedOn, restarted: copied.restarted });
});

app.put('/v1/shares/:slug/outcome-consent', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  const body = await readJson(c);
  const ok = await setOutcomeConsent(c.env.DB, c.req.param('slug'), user.id, body.consent === true);
  if (!ok) return c.json({ error: 'This stack is no longer shared.' }, 404);
  return c.json({ consent: body.consent === true });
});

app.post('/v1/shares/:slug/outcome', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  if (!(await allow(c.env.DB, `outcome:${user.id}`, 10, 86_400))) return tooMany(c);
  const saved = await submitOutcome(c.env.DB, c.req.param('slug'), user.id, await readJson(c));
  if (!saved.ok) return c.json({ error: saved.error }, saved.status as 400);
  return c.json({ saved: saved.saved });
});

app.get('/v1/shares/:slug/cohorts', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in to see results from people who copied this.' }, 401);
  const profile = await readProfile(c.env.DB, user.id);
  const report = await cohortReport(c.env.DB, c.req.param('slug'), { ageRange: profile?.age_range ?? null, sex: profile?.sex ?? null });
  if (!report) return c.json({ error: 'This stack is no longer shared.' }, 404);
  return c.json(report);
});

app.get('/v1/library', async (c) => {
  const user = await userFromRequest(c);
  const segment = c.req.query('segment') ?? c.req.query('tab');
  await refreshDailyStats(c.env.DB);
  const profile = user ? await readProfile(c.env.DB, user.id) : null;
  const page = await searchLibrary(c.env.DB, {
    segment: (['new', 'top', 'saved', 'like_you'] as const).includes(segment as LibrarySegment) ? (segment as LibrarySegment) : 'top',
    q: (c.req.query('q') ?? '').slice(0, 80),
    goal: c.req.query('goal') ?? '',
    limit: intParam(c.req.query('limit'), 20, 1, 50),
    offset: intParam(c.req.query('offset'), 0, 0, 10_000),
    viewer: user ? { id: user.id, ageRange: profile?.age_range ?? null, sex: profile?.sex ?? null } : null,
  });
  return c.json(page);
});

app.post('/v1/shares/:slug/save', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  const saved = await setSaved(c.env.DB, c.req.param('slug'), user.id, true);
  if (!saved.ok) return c.json({ error: saved.error }, saved.status as 400);
  return c.json({ saved: true });
});

app.delete('/v1/shares/:slug/save', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  const saved = await setSaved(c.env.DB, c.req.param('slug'), user.id, false);
  if (!saved.ok) return c.json({ error: saved.error }, saved.status as 400);
  return c.json({ saved: false });
});

app.post('/v1/shares/:slug/report', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  if (!(await allow(c.env.DB, `report:${user.id}`, 20, 86_400))) return tooMany(c);
  const body = await readJson(c);
  const reported = await reportShare(c.env.DB, c.req.param('slug'), user.id, body.reason, body.note);
  if (!reported.ok) return c.json({ error: reported.error }, reported.status as 400);
  return c.json({ ok: true });
});

app.post('/v1/shares/:slug/block', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  const blocked = await blockCreator(c.env.DB, c.req.param('slug'), user.id, true);
  if (!blocked.ok) return c.json({ error: blocked.error }, blocked.status as 400);
  return c.json({ blocked: true });
});

app.delete('/v1/shares/:slug/block', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  const blocked = await blockCreator(c.env.DB, c.req.param('slug'), user.id, false);
  if (!blocked.ok) return c.json({ error: blocked.error }, blocked.status as 400);
  return c.json({ blocked: false });
});

app.get('/v1/admin/reports', async (c) => {
  const denied = adminDenied(c);
  if (denied) return denied;
  const rows = await c.env.DB.prepare(
    `SELECT s.slug, s.stack_name, s.creator_name, s.hidden_at, s.review_status, s.listed,
            COUNT(r.user_id) AS open_reports, GROUP_CONCAT(r.reason, ' | ') AS reasons, MAX(r.created_at) AS last_report
     FROM shares s JOIN share_reports r ON r.share_id = s.id AND r.resolved_at IS NULL
     WHERE s.revoked_at IS NULL
     GROUP BY s.id
     ORDER BY s.hidden_at IS NULL, open_reports DESC, last_report DESC
     LIMIT 100`,
  )
    .bind()
    .all();
  return c.json({ queue: rows.results ?? [] });
});

app.post('/v1/admin/shares/:slug', async (c) => {
  const denied = adminDenied(c);
  if (denied) return denied;
  const row = await liveRow(c.env.DB, c.req.param('slug'), { includeHidden: true });
  if (!row) return c.json({ error: 'Not found.' }, 404);
  const body = await readJson(c);
  const action = body.action;
  const note = typeof body.note === 'string' ? body.note.slice(0, 300) : null;
  const now = new Date().toISOString();
  const db = c.env.DB;
  const log = db
    .prepare('INSERT INTO moderation_log (id, share_id, action, note, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(randomId(), row.id, String(action), note, now);
  if (action === 'restore') {
    await db.batch([
      db.prepare("UPDATE shares SET hidden_at = NULL, review_status = 'cleared' WHERE id = ?").bind(row.id),
      db.prepare('UPDATE share_reports SET resolved_at = ? WHERE share_id = ? AND resolved_at IS NULL').bind(now, row.id),
      log,
    ]);
  } else if (action === 'hide') {
    await db.batch([db.prepare("UPDATE shares SET hidden_at = ?, review_status = 'pending' WHERE id = ?").bind(now, row.id), log]);
  } else if (action === 'remove') {
    await db.batch([
      db.prepare("UPDATE shares SET revoked_at = ?, listed = 0, review_status = 'removed' WHERE id = ?").bind(now, row.id),
      db.prepare('UPDATE share_reports SET resolved_at = ? WHERE share_id = ? AND resolved_at IS NULL').bind(now, row.id),
      log,
    ]);
  } else {
    return c.json({ error: 'Use restore, hide, or remove.' }, 400);
  }
  await syncSearchRow(db, row.id);
  return c.json({ ok: true, action });
});

app.get('/s/:slug/get', async (c) => {
  const slug = c.req.param('slug');
  if (!isSlug(slug)) return c.redirect('/', 302);
  if (c.env.AUTH_PEPPER && (await allowAddress(c, 'link_get', 30, 3600))) {
    const key = await addressKey(c.env.AUTH_PEPPER, clientAddress((name) => c.req.header(name)));
    await c.env.DB.prepare(
      `INSERT INTO pending_links (ip_hash, slug, created_at) VALUES (?, ?, ?)
       ON CONFLICT(ip_hash) DO UPDATE SET slug = excluded.slug, created_at = excluded.created_at`,
    )
      .bind(key, slug, new Date().toISOString())
      .run();
  }
  if (c.env.APP_STORE_ID) return c.redirect(`https://apps.apple.com/app/id${encodeURIComponent(c.env.APP_STORE_ID)}`, 302);
  return c.redirect(`stack://s/${slug}`, 302);
});

app.post('/v1/links/claim', async (c) => {
  if (!c.env.AUTH_PEPPER) return c.json({ slug: null });
  if (!(await allowAddress(c, 'link_claim', 30, 3600))) return tooMany(c);
  const key = await addressKey(c.env.AUTH_PEPPER, clientAddress((name) => c.req.header(name)));
  const since = new Date(Date.now() - 2 * 3_600_000).toISOString();
  const row = await c.env.DB.prepare('DELETE FROM pending_links WHERE ip_hash = ? RETURNING slug, created_at')
    .bind(key)
    .first<{ slug: string; created_at: string }>();
  if (!row || row.created_at < since) return c.json({ slug: null });
  const live = await liveRow(c.env.DB, row.slug);
  return c.json({ slug: live ? row.slug : null });
});

app.get('/.well-known/apple-app-site-association', (c) => appSiteAssociation(c));
app.get('/apple-app-site-association', (c) => appSiteAssociation(c));

app.get('/s/:slug/og.png', (c) => sharePng(c, 'card'));
app.get('/s/:slug/story.png', (c) => sharePng(c, 'story'));
app.get('/s/:slug/og.svg', (c) => shareSvg(c, 'card'));
app.get('/s/:slug/story.svg', (c) => shareSvg(c, 'story'));

app.get('/s/:slug', async (c) => {
  const found = await publicShare(c.env.DB, c.req.param('slug'));
  const context = pageContext(c);
  if (!found) return c.html(renderSharePage(null, context), 404);
  await trackShareView(c, found.row, null);
  return c.html(renderSharePage(found.view, context), 200);
});

export default app;

export async function scheduled(env: Bindings): Promise<void> {
  await refreshDailyStats(env.DB, new Date(), true);
}

function pageContext(c: AppContext): PageContext {
  return { origin: publicOrigin(c), appStoreId: c.env.APP_STORE_ID?.trim() || null };
}

function publicOrigin(c: AppContext): string {
  const configured = c.env.PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');
  if (configured && /^https:\/\//.test(configured)) return configured;
  return new URL(c.req.url).origin;
}

function shareUrl(c: AppContext, slug: string): string {
  return `${publicOrigin(c)}/s/${slug}`;
}

function ogInput(c: AppContext, view: Awaited<ReturnType<typeof publicShare>> extends infer R ? (R extends { view: infer V } ? V : never) : never) {
  return {
    stackName: view.stackName,
    creator: usernameHandle(view.username) ?? 'A Stack user',
    productCount: view.products.length,
    score: view.auditScore,
    summary: view.score.summary,
    composition: view.score.totals.map((total) => ({ name: total.name, ofLimit: total.ofLimit })),
    host: new URL(publicOrigin(c)).host,
    result: publishedResult(view.result, usernameHandle(view.username)),
    copyLabel: copyCountLabel(view.copyCount),
    spendLabel: spendSentence(view.spend ?? []),
  };
}

async function shareSvg(c: AppContext, kind: 'card' | 'story') {
  const slug = c.req.param('slug');
  if (!slug) return c.notFound();
  const found = await publicShare(c.env.DB, slug);
  if (!found) return c.notFound();
  const svg = kind === 'card' ? ogSvg(ogInput(c, found.view)) : storySvg(ogInput(c, found.view));
  return new Response(svg, { headers: { 'content-type': 'image/svg+xml' } });
}

async function sharePng(c: AppContext, kind: 'card' | 'story') {
  const slug = c.req.param('slug');
  if (!slug) return c.notFound();
  const found = await publicShare(c.env.DB, slug);
  if (!found) return c.notFound();
  const version = kind === 'card' ? ogImageVersion(found.row.version) : storyImageVersion(found.row.version);
  const cached = await c.env.DB.prepare('SELECT png FROM share_images WHERE share_id = ? AND version = ?')
    .bind(found.row.id, version)
    .first<{ png: ArrayBuffer | Uint8Array }>();
  let png = cached ? toBytes(cached.png) : null;
  if (!png) {
    const assets = c.env.OG_ASSETS ?? (await import('./ogAssets')).OG_ASSETS;
    const input = ogInput(c, found.view);
    const svg = kind === 'card' ? ogSvg(input) : storySvg(input);
    png = await renderOgPng(svg, assets, kind === 'card' ? 1200 : 1080);
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM share_images WHERE share_id = ? AND version = ?').bind(found.row.id, found.row.version),
      c.env.DB.prepare('DELETE FROM share_images WHERE share_id = ? AND version = ?').bind(found.row.id, version),
      c.env.DB.prepare('INSERT INTO share_images (share_id, version, png, created_at) VALUES (?, ?, ?, ?)').bind(
        found.row.id,
        version,
        png,
        new Date().toISOString(),
      ),
    ]);
  }
  return new Response(png, {
    headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' },
  });
}

function toBytes(value: ArrayBuffer | Uint8Array | number[]): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return new Uint8Array(value);
  return new Uint8Array(value);
}

function appSiteAssociation(c: AppContext): Response {
  const team = c.env.APPLE_TEAM_ID?.trim();
  const bundle = c.env.APPLE_AUDIENCE?.trim();
  if (!team || !bundle) return c.json({ error: 'Not configured.' }, 404);
  return c.json({
    applinks: {
      details: [{ appIDs: [`${team}.${bundle}`], components: [{ '/': '/s/*', comment: 'Shared stacks' }] }],
    },
  });
}

function adminDenied(c: AppContext): Response | null {
  const secret = c.env.ADMIN_TOKEN;
  if (!secret) return c.json({ error: 'Moderation is not configured.' }, 503);
  const header = c.req.header('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!presented || !safeEqual(presented, secret)) return c.json({ error: 'Unauthorized.' }, 401);
  return null;
}

/** Counts a real open of the public page or the in-app stack detail. Image fetches are not views. */
async function trackShareView(c: AppContext, row: { id: string; user_id: string }, viewerId: string | null): Promise<void> {
  try {
    const pepper = c.env.AUTH_PEPPER || 'local';
    const key = await addressKey(pepper, clientAddress((name) => c.req.header(name)));
    await recordShareView(c.env.DB, {
      shareId: row.id,
      ownerId: row.user_id,
      viewerId,
      addressKey: key,
      userAgent: c.req.header('user-agent'),
    });
  } catch {
    // A failed view write must not break the page.
  }
}

async function allowAddress(c: AppContext, bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  const pepper = c.env.AUTH_PEPPER || 'local';
  const key = await addressKey(pepper, clientAddress((name) => c.req.header(name)));
  return allow(c.env.DB, `${bucket}:${key}`, limit, windowSeconds);
}

function tooMany(c: AppContext): Response {
  return c.json({ error: 'Too many requests. Try again in a little while.' }, 429);
}

function dsldFetcher(env: Bindings): (input: string, init?: RequestInit) => Promise<Response> {
  return env.DSLD_FETCH ?? fetch;
}

function offFetcher(env: Bindings): (input: string, init?: RequestInit) => Promise<Response> {
  return env.OFF_FETCH ?? env.DSLD_FETCH ?? fetch;
}

function labelError(c: { json: (body: unknown, status?: number) => Response }, error: unknown): Response {
  if (error instanceof DsldBudgetError) {
    return c.json({ error: 'The label service is busy. Try again in a little while.' }, 503);
  }
  return c.json({ error: 'The label database could not be reached.' }, 502);
}

async function readJson(c: { req: { json: () => Promise<unknown> } }): Promise<Record<string, unknown>> {
  const body = await c.req.json().catch(() => null);
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function publicUser(user: UserRow) {
  return { id: user.id, email: user.email };
}

async function userFromRequest(c: { env: Bindings; req: { header: (name: string) => string | undefined } }): Promise<UserRow | null> {
  const header = c.req.header('authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const row = await c.env.DB.prepare(
    `SELECT users.id AS id, users.email AS email, users.apple_sub AS apple_sub, sessions.expires_at AS expires_at
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ?`,
  )
    .bind(await hashToken(token))
    .first<{ id: string; email: string | null; apple_sub: string | null; expires_at: string }>();
  if (!row || Date.parse(row.expires_at) <= Date.now()) return null;
  return { id: row.id, email: row.email, apple_sub: row.apple_sub };
}

async function findOrCreateUser(db: D1Database, input: { email?: string | null; appleSub?: string | null }): Promise<UserRow> {
  if (input.appleSub) {
    const existing = await db.prepare('SELECT id, email, apple_sub FROM users WHERE apple_sub = ?')
      .bind(input.appleSub)
      .first<UserRow>();
    if (existing) {
      if (input.email && !existing.email) {
        await db.prepare('UPDATE users SET email = ? WHERE id = ?').bind(input.email, existing.id).run();
        return { ...existing, email: input.email };
      }
      return existing;
    }
  }
  if (input.email) {
    const existing = await db.prepare('SELECT id, email, apple_sub FROM users WHERE email = ?').bind(input.email).first<UserRow>();
    if (existing) {
      if (input.appleSub && !existing.apple_sub) {
        await db.prepare('UPDATE users SET apple_sub = ? WHERE id = ?').bind(input.appleSub, existing.id).run();
        return { ...existing, apple_sub: input.appleSub };
      }
      return existing;
    }
  }
  const user: UserRow = { id: randomId(), email: input.email ?? null, apple_sub: input.appleSub ?? null };
  await db
    .prepare('INSERT INTO users (id, email, apple_sub, created_at) VALUES (?, ?, ?, ?)')
    .bind(user.id, user.email, user.apple_sub, new Date().toISOString())
    .run();
  return user;
}

async function createSession(db: D1Database, userId: string): Promise<{ token: string }> {
  const token = randomToken();
  const now = new Date();
  await db
    .prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(randomId(), userId, await hashToken(token), new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), now.toISOString())
    .run();
  return { token };
}

function parseProducts(value: unknown): StackProduct[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const products: StackProduct[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null;
    const product = entry as Record<string, unknown>;
    if (typeof product.name !== 'string' || product.name.length === 0 || product.name.length > 120) return null;
    if (typeof product.priceCents !== 'number' || typeof product.servingsPerContainer !== 'number' || typeof product.servingsPerDay !== 'number') {
      return null;
    }
    if (typeof product.startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(product.startDate)) return null;
    if (!Array.isArray(product.ingredients) || product.ingredients.length > 40) return null;
    const ingredients: StackIngredient[] = [];
    for (const raw of product.ingredients) {
      if (!raw || typeof raw !== 'object') return null;
      const ingredient = raw as Record<string, unknown>;
      if (typeof ingredient.key !== 'string' || typeof ingredient.name !== 'string') return null;
      if (typeof ingredient.amount !== 'number' || typeof ingredient.unit !== 'string' || typeof ingredient.costWeight !== 'number') {
        return null;
      }
      ingredients.push({
        key: ingredient.key,
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        costWeight: ingredient.costWeight,
        summary: typeof ingredient.summary === 'string' ? ingredient.summary : undefined,
        family: typeof ingredient.family === 'string' ? ingredient.family : undefined,
        familyLabel: typeof ingredient.familyLabel === 'string' ? ingredient.familyLabel : undefined,
      });
    }
    products.push({
      id: typeof product.id === 'string' && product.id ? product.id : randomId(),
      name: product.name,
      brand: typeof product.brand === 'string' ? product.brand : null,
      note: typeof product.note === 'string' ? product.note : null,
      priceCents: product.priceCents,
      servingsPerContainer: product.servingsPerContainer,
      servingsPerDay: product.servingsPerDay,
      startDate: product.startDate,
      catalogueId: typeof product.catalogueId === 'string' ? product.catalogueId : null,
      priceCurrency: isCurrency(product.priceCurrency) ? product.priceCurrency : 'USD',
      ingredients,
    });
  }
  return products;
}
