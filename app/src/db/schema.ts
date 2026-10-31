import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  catalogueId: text('catalogue_id'),
  name: text('name').notNull(),
  brand: text('brand'),
  note: text('note'),
  priceCents: integer('price_cents').notNull(),
  priceCurrency: text('price_currency').notNull().default('USD'),
  servingsPerContainer: integer('servings_per_container').notNull(),
  servingsPerDay: real('servings_per_day').notNull(),
  startDate: text('start_date').notNull(),
  createdAt: text('created_at').notNull(),
});

export const productIngredients = sqliteTable('product_ingredients', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  key: text('key').notNull(),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  unit: text('unit').notNull(),
  costWeight: real('cost_weight').notNull(),
  summary: text('summary'),
  family: text('family'),
  familyLabel: text('family_label'),
});

export const healthSamples = sqliteTable('health_samples', {
  id: text('id').primaryKey(),
  metric: text('metric').notNull(),
  date: text('date').notNull(),
  value: real('value').notNull(),
  source: text('source').notNull(),
});

export const dayTags = sqliteTable('day_tags', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  kind: text('kind').notNull(),
});

export const settingsRows = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const reminders = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  time: text('time').notNull(),
  days: text('days').notNull(),
});

export const intakeLogs = sqliteTable(
  'intake_logs',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull(),
    day: text('day').notNull(),
    takenAt: text('taken_at').notNull(),
  },
  (table) => [uniqueIndex('intake_product_day').on(table.productId, table.day)],
);
