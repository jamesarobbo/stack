import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { verifyAppleIdentityToken, AuthError } from './apple';
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
import { subscriptionFromEvent, subscriptionIsPro, type RevenueCatEvent } from './revenuecat';

export type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
  AUTH_PEPPER: string;
  APPLE_AUDIENCE: string;
  REVENUECAT_WEBHOOK_AUTH: string;
  DSLD_FETCH?: (input: string, init?: RequestInit) => Promise<Response>;
};

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
    'INSERT INTO email_codes (id, email, code_hash, expires_at, consumed_at, created_at) VALUES (?, ?, ?, ?, NULL, ?)',
  )
    .bind(randomId(), email, await hashCode(pepper, email, code), new Date(now.getTime() + 10 * 60 * 1000).toISOString(), now.toISOString())
    .run();

  if (c.env.ENVIRONMENT === 'production') return c.json({ ok: true });
  return c.json({ ok: true, devCode: code });
});

app.post('/v1/auth/email/verify', async (c) => {
  const body = await readJson(c);
  const email = normalizeEmail(body.email);
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!email || !/^\d{6}$/.test(code)) return c.json({ error: 'Enter the 6-digit code.' }, 400);
  const pepper = c.env.AUTH_PEPPER;
  if (!pepper) return c.json({ error: 'Auth is not configured.' }, 500);
  const row = await c.env.DB.prepare(
    `SELECT id, code_hash FROM email_codes
     WHERE email = ? AND consumed_at IS NULL AND expires_at > ?
     ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(email, new Date().toISOString())
    .first<{ id: string; code_hash: string }>();
  const expected = await hashCode(pepper, email, code);
  const matches = row ? safeEqual(row.code_hash, expected) : safeEqual(expected, expected.slice(0, 0).padEnd(expected.length, '0'));
  if (!row || !matches) return c.json({ error: 'That code is not valid.' }, 401);
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
  return c.json({
    user: publicUser(user),
    pro: subscriptionIsPro(subscription),
    subscription,
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
  return c.json({ ok: true, updatedAt: now });
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
    return c.json({ ...result, attribution: DSLD_ATTRIBUTION });
  } catch (error) {
    return labelError(c, error);
  }
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

app.delete('/v1/account', async (c) => {
  const user = await userFromRequest(c);
  if (!user) return c.json({ error: 'Sign in required.' }, 401);
  await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run();
  await c.env.DB.prepare('DELETE FROM subscriptions WHERE user_id = ?').bind(user.id).run();
  await c.env.DB.prepare('DELETE FROM synced_stacks WHERE user_id = ?').bind(user.id).run();
  await c.env.DB.prepare('DELETE FROM contributed_labels WHERE user_id = ?').bind(user.id).run();
  if (user.email) await c.env.DB.prepare('DELETE FROM email_codes WHERE email = ?').bind(user.email).run();
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();
  return c.json({ ok: true });
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

export default app;

function dsldFetcher(env: Bindings): (input: string, init?: RequestInit) => Promise<Response> {
  return env.DSLD_FETCH ?? fetch;
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
      ingredients,
    });
  }
  return products;
}
