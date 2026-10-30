import { and, eq } from 'drizzle-orm';
import { buildExample } from '../data/example';
import { coerceUnit } from '../data/units';
import { clampStartDate, localToday } from '../dates';
import type { IngredientInput, ProductInput, SampleInput, TagInput, TagKind } from '../domain/types';
import { connectAppleHealth, refreshAppleHealth } from '../health/connect';
import type { HealthConnection } from '../health/types';
import { randomId } from '../id';
import { clearSettings, getSetting, registerSettingsPersistence, setSetting } from '../settings';
import { sampleSeedAction, shouldClearExampleHealthSource, shouldResetSeededName } from './sampleSeed';
import { db } from './client';
import { dayTags, healthSamples, productIngredients, products, settingsRows } from './schema';

export type Snapshot = {
  products: ProductInput[];
  samples: SampleInput[];
  tags: TagInput[];
};

let persistenceReady = false;

function ensurePersistence() {
  if (persistenceReady) return;
  persistenceReady = true;
  registerSettingsPersistence(async (key, value) => {
    if (value == null) {
      await db.delete(settingsRows).where(eq(settingsRows.key, key));
      return;
    }
    await db
      .insert(settingsRows)
      .values({ key, value })
      .onConflictDoUpdate({ target: settingsRows.key, set: { value } });
  });
}

export async function prepareSettings() {
  ensurePersistence();
  const { hydrateSettings } = await import('../settings');
  await hydrateSettings(async () => {
    const rows = await db.select().from(settingsRows);
    return rows.map((row) => [row.key, row.value] as [string, string]);
  });
}

function mapProduct(
  row: typeof products.$inferSelect,
  ingredients: (typeof productIngredients.$inferSelect)[],
): ProductInput {
  return {
    id: row.id,
    catalogueId: row.catalogueId,
    name: row.name,
    brand: row.brand,
    note: row.note,
    priceCents: row.priceCents,
    servingsPerContainer: row.servingsPerContainer,
    servingsPerDay: row.servingsPerDay,
    startDate: row.startDate,
    ingredients: ingredients
      .filter((ingredient) => ingredient.productId === row.id)
      .map((ingredient) => ({
        key: ingredient.key,
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        costWeight: ingredient.costWeight,
        summary: ingredient.summary ?? undefined,
        family: ingredient.family ?? undefined,
        familyLabel: ingredient.familyLabel ?? undefined,
      })),
  };
}

export async function loadSnapshot(): Promise<Snapshot> {
  const productRows = await db.select().from(products);
  const ingredientRows = await db.select().from(productIngredients);
  const sampleRows = await db.select().from(healthSamples);
  const tagRows = await db.select().from(dayTags);
  const ordered = [...productRows].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    products: ordered.map((row) => mapProduct(row, ingredientRows)),
    samples: sampleRows.map((row) => ({
      metric: row.metric as SampleInput['metric'],
      date: row.date,
      value: row.value,
    })),
    tags: tagRows.map((row) => ({ date: row.date, kind: row.kind as TagKind })),
  };
}

async function insertProduct(product: ProductInput, createdAt: string) {
  await db.insert(products).values({
    id: product.id,
    catalogueId: product.catalogueId ?? null,
    name: product.name,
    brand: product.brand,
    note: product.note,
    priceCents: product.priceCents,
    servingsPerContainer: product.servingsPerContainer,
    servingsPerDay: product.servingsPerDay,
    startDate: product.startDate,
    createdAt,
  });
  if (product.ingredients.length === 0) return;
  await db.insert(productIngredients).values(
    product.ingredients.map((ingredient) => ({
      id: randomId(),
      productId: product.id,
      key: ingredient.key,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: coerceUnit(ingredient.unit),
      costWeight: ingredient.costWeight,
      summary: ingredient.summary ?? null,
      family: ingredient.family ?? null,
      familyLabel: ingredient.familyLabel ?? null,
    })),
  );
}

async function insertSamples(samples: SampleInput[], source: string) {
  const rows = samples.map((sample) => ({
    id: randomId(),
    metric: sample.metric,
    date: sample.date,
    value: sample.value,
    source,
  }));
  for (let i = 0; i < rows.length; i += 80) {
    await db.insert(healthSamples).values(rows.slice(i, i + 80));
  }
}

/** One-time: drop the fictional seed if the user never edited it. Never inserts example data. */
export async function clearUntouchedSampleOnce() {
  const action = sampleSeedAction({
    sampleSeedCleared: getSetting('sampleSeedCleared'),
    usingSampleData: getSetting('usingSampleData'),
  });
  if (action === 'skip') return;
  if (action === 'clear') {
    await db.delete(productIngredients);
    await db.delete(products);
    await db.delete(healthSamples);
    await db.delete(dayTags);
    if (shouldResetSeededName(action, getSetting('displayName'))) await setSetting('displayName', '');
    if (shouldClearExampleHealthSource(action, getSetting('healthSource'))) await setSetting('healthSource', '');
    await setSetting('usingSampleData', '0');
  }
  await setSetting('sampleSeedCleared', '1');
}

export async function loadExample() {
  await db.delete(productIngredients);
  await db.delete(products);
  await db.delete(healthSamples);
  await db.delete(dayTags);
  const today = localToday();
  const example = buildExample(today);
  for (let index = 0; index < example.products.length; index += 1) {
    const product = example.products[index];
    if (!product) continue;
    await insertProduct(product, `${today}T00:00:0${index}.000Z`);
  }
  await insertSamples(example.samples, 'example');
  if (example.tags.length > 0) {
    await db.insert(dayTags).values(example.tags.map((tag) => ({ id: randomId(), date: tag.date, kind: tag.kind })));
  }
  await setSetting('displayName', 'Alex');
  await setSetting('usingSampleData', '1');
  await setSetting('healthSource', 'example');
}

export async function addProduct(input: {
  name: string;
  brand?: string | null;
  note?: string | null;
  priceCents: number;
  servingsPerContainer: number;
  servingsPerDay: number;
  startDate: string;
  catalogueId?: string | null;
  ingredients: IngredientInput[];
}) {
  await insertProduct(
    {
      id: randomId(),
      name: input.name.trim(),
      brand: input.brand ?? null,
      note: input.note ?? null,
      priceCents: input.priceCents,
      servingsPerContainer: input.servingsPerContainer,
      servingsPerDay: input.servingsPerDay,
      startDate: clampStartDate(input.startDate),
      catalogueId: input.catalogueId ?? null,
      ingredients: input.ingredients,
    },
    new Date().toISOString(),
  );
  await setSetting('usingSampleData', '0');
}

export async function updateProductPrice(id: string, priceCents: number) {
  const cents = Math.max(0, Math.round(priceCents));
  await db.update(products).set({ priceCents: cents }).where(eq(products.id, id));
  await setSetting('usingSampleData', '0');
}

export async function updateProductStartDate(id: string, startDate: string) {
  await db.update(products).set({ startDate: clampStartDate(startDate) }).where(eq(products.id, id));
  await setSetting('usingSampleData', '0');
}

export async function updateIngredientUnit(productId: string, key: string, name: string, unit: string) {
  await db
    .update(productIngredients)
    .set({ unit: coerceUnit(unit) })
    .where(and(eq(productIngredients.productId, productId), eq(productIngredients.key, key), eq(productIngredients.name, name)));
  await setSetting('usingSampleData', '0');
}

export async function removeProduct(id: string) {
  await db.delete(productIngredients).where(eq(productIngredients.productId, id));
  await db.delete(products).where(eq(products.id, id));
  await setSetting('usingSampleData', '0');
}

export async function addTag(kind: TagKind, date = localToday()) {
  const existing = await db.select().from(dayTags);
  if (existing.some((tag) => tag.date === date && tag.kind === kind)) return;
  await db.insert(dayTags).values({ id: randomId(), date, kind });
}

export async function connectHealth(): Promise<string> {
  const result = await connectAppleHealth();
  if (result.mode === 'healthkit') await storeHealth(result);
  return result.message;
}

const HEALTH_REFRESH_MS = 12 * 60 * 60 * 1000;

/** Re-reads Apple Health on launch at most twice a day, without showing a permission sheet. */
export async function refreshHealthIfStale(now = Date.now()): Promise<boolean> {
  if (getSetting('healthSource') !== 'healthkit') return false;
  const last = Date.parse(getSetting('healthReadAt') ?? '');
  if (Number.isFinite(last) && now - last < HEALTH_REFRESH_MS) return false;
  const result = await refreshAppleHealth();
  if (!result || result.mode !== 'healthkit' || !result.samples || result.samples.length === 0) return false;
  await storeHealth(result);
  return true;
}

async function storeHealth(result: HealthConnection) {
  await db.delete(healthSamples);
  if (result.samples && result.samples.length > 0) await insertSamples(result.samples, 'healthkit');
  await setSetting('healthSource', 'healthkit');
  await setSetting('usingSampleData', '0');
  await setSetting('healthReadAt', new Date().toISOString());
  if (result.device) await setSetting('healthDevice', result.device);
  if (result.demographics?.birthDate) await setSetting('healthBirthDate', result.demographics.birthDate);
  if (result.demographics?.sex) await setSetting('healthSex', result.demographics.sex);
}

export type NewProduct = {
  name: string;
  brand?: string | null;
  note?: string | null;
  priceCents: number;
  servingsPerContainer: number;
  servingsPerDay: number;
  startDate: string;
  catalogueId?: string | null;
  ingredients: IngredientInput[];
};

/** Adds several products in one transaction, so a copy lands whole or not at all. */
export async function addProducts(list: NewProduct[], options: { replaceIds?: string[] } = {}) {
  const now = Date.now();
  db.transaction((tx) => {
    for (const id of options.replaceIds ?? []) {
      tx.delete(productIngredients).where(eq(productIngredients.productId, id)).run();
      tx.delete(products).where(eq(products.id, id)).run();
    }
    list.forEach((input, index) => {
      const id = randomId();
      tx.insert(products)
        .values({
          id,
          catalogueId: input.catalogueId ?? null,
          name: input.name.trim(),
          brand: input.brand ?? null,
          note: input.note ?? null,
          priceCents: Math.max(0, Math.round(input.priceCents)),
          servingsPerContainer: input.servingsPerContainer,
          servingsPerDay: input.servingsPerDay,
          startDate: clampStartDate(input.startDate),
          createdAt: new Date(now + index).toISOString(),
        })
        .run();
      if (input.ingredients.length === 0) return;
      tx.insert(productIngredients)
        .values(
          input.ingredients.map((ingredient) => ({
            id: randomId(),
            productId: id,
            key: ingredient.key,
            name: ingredient.name,
            amount: ingredient.amount,
            unit: coerceUnit(ingredient.unit),
            costWeight: ingredient.costWeight,
            summary: ingredient.summary ?? null,
            family: ingredient.family ?? null,
            familyLabel: ingredient.familyLabel ?? null,
          })),
        )
        .run();
    });
  });
  await setSetting('usingSampleData', '0');
}

export async function deleteLocalData() {
  await db.delete(productIngredients);
  await db.delete(products);
  await db.delete(healthSamples);
  await db.delete(dayTags);
  await db.delete(settingsRows);
  await clearSettings();
}

export async function exportPayload() {
  const snapshot = await loadSnapshot();
  return {
    app: 'Stack',
    exportedAt: new Date().toISOString(),
    note: 'Educational export of what you logged on this device. Not a medical record.',
    products: snapshot.products,
    healthSamples: snapshot.samples,
    dayTags: snapshot.tags,
  };
}

export async function replaceProductsFromSync(incoming: ProductInput[]) {
  await db.delete(productIngredients);
  await db.delete(products);
  for (let index = 0; index < incoming.length; index += 1) {
    const product = incoming[index];
    if (!product) continue;
    await insertProduct(
      { ...product, id: product.id || randomId() },
      `${localToday()}T00:00:${String(index).padStart(2, '0')}.000Z`,
    );
  }
  await setSetting('usingSampleData', '0');
}
