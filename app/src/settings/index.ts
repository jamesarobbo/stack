import { createDriver } from './settingsStore';

const driver = createDriver();
const cache = new Map<string, string>();

let writeSqlite: (key: string, value: string | null) => Promise<void> = async () => {};

export const settingsDriverKind: string = driver.kind;

export function registerSettingsPersistence(write: (key: string, value: string | null) => Promise<void>) {
  writeSqlite = write;
}

export async function hydrateSettings(readSqlite: () => Promise<[string, string][]>) {
  cache.clear();
  if (driver.kind === 'memory') {
    for (const [key, value] of await readSqlite()) cache.set(key, value);
    return;
  }
  for (const [key, value] of driver.entries()) cache.set(key, value);
}

export function getSetting(key: string): string | null {
  return cache.has(key) ? (cache.get(key) ?? null) : null;
}

export async function setSetting(key: string, value: string) {
  cache.set(key, value);
  if (driver.kind === 'memory') {
    await writeSqlite(key, value);
    return;
  }
  driver.set(key, value);
}

export async function clearSettings() {
  const keys = [...cache.keys()];
  cache.clear();
  driver.clear();
  if (driver.kind === 'memory') {
    for (const key of keys) await writeSqlite(key, null);
  }
}
