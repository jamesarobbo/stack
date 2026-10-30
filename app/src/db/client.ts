import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { Platform } from 'react-native';
import migrations from '../../drizzle/migrations';
import * as schema from './schema';

/**
 * Chrome does not start a Worker until the current turn yields, and
 * expo-sqlite's sync API busy-waits in that same turn. The first open on web
 * can time out, or the worker can answer before its VFS is registered.
 * A later attempt finds the worker ready. While that worker compiles SQLite's
 * wasm, the library's short Atomics.pause budget is too small, so the retry
 * uses a slightly longer pause.
 */
function setPause(value: (() => void) | undefined) {
  if (typeof Atomics === 'undefined') return;
  try {
    Object.defineProperty(Atomics, 'pause', { configurable: true, writable: true, value });
  } catch {
    // Native runtimes that do not expose a writable Atomics.pause keep their own.
  }
}

function slowPause() {
  const start = performance.now();
  while (performance.now() - start < 0.25) {
    // Give the worker thread time to finish compiling wasm.
  }
}

const originalPause =
  typeof Atomics !== 'undefined' && typeof Atomics.pause === 'function' ? Atomics.pause.bind(Atomics) : undefined;

function openSqlite() {
  return drizzle(openDatabaseSync('stack.db'), { schema });
}

export type AppDatabase = ReturnType<typeof openSqlite>;

export let db: AppDatabase;

function isWebSqliteWarmup(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes('Sync operation timeout') || error.message.includes('Invalid VFS state');
}

async function openFresh(): Promise<AppDatabase> {
  if (Platform.OS !== 'web') {
    db = openSqlite();
    return db;
  }

  setPause(() => undefined);
  try {
    try {
      db = openSqlite();
      return db;
    } catch (error) {
      if (!isWebSqliteWarmup(error)) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
    setPause(slowPause);
    try {
      db = openSqlite();
      return db;
    } catch (error) {
      if (!isWebSqliteWarmup(error)) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 600));
    db = openSqlite();
    return db;
  } finally {
    setPause(originalPause ?? (() => undefined));
  }
}

let opening: Promise<AppDatabase> | null = null;

export function openStackDatabase(): Promise<AppDatabase> {
  if (!opening) opening = openFresh();
  return opening;
}

export { migrations };
