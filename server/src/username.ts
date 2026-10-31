import { normalizeUsername, usernameFormatError } from '../../shared/username';
import { syncSearchRow } from './library';

const RESERVED = new Set([
  'admin',
  'administrator',
  'support',
  'help',
  'official',
  'staff',
  'moderator',
  'mod',
  'system',
  'root',
  'api',
  'www',
  'null',
  'undefined',
  'anonymous',
  'username',
  'noreply',
  'postmaster',
  'security',
  'abuse',
  'stack',
  'stackapp',
  'owner',
  'team',
  'contact',
  'info',
]);

/** Exact, token, or (for longer words) contained. Short words stay exact so ordinary names are not caught. */
const OFFENSIVE = [
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'slut',
  'whore',
  'rape',
  'rapist',
  'porn',
  'nazi',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'kike',
  'spic',
  'chink',
  'tranny',
];

function matchesWord(name: string, word: string, contained: boolean): boolean {
  if (name === word) return true;
  const tokens = name.split('_').filter(Boolean);
  if (tokens.includes(word)) return true;
  const squeezed = name.replace(/_/g, '');
  if (squeezed === word) return true;
  if (contained && word.length >= 5 && (name.includes(word) || squeezed.includes(word))) return true;
  return false;
}

export function usernameBlocked(name: string): boolean {
  for (const word of RESERVED) {
    if (matchesWord(name, word, false)) return true;
  }
  for (const word of OFFENSIVE) {
    if (matchesWord(name, word, true)) return true;
  }
  return false;
}

export function usernameRejection(raw: string): string | null {
  const format = usernameFormatError(raw);
  if (format) return format;
  if (usernameBlocked(normalizeUsername(raw))) return 'That username is not available.';
  return null;
}

export async function usernameAvailable(
  db: D1Database,
  raw: string,
  userId: string,
): Promise<{ available: boolean; error?: string }> {
  const rejection = usernameRejection(raw);
  if (rejection) return { available: false, error: rejection };
  const name = normalizeUsername(raw);
  const row = await db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').bind(name).first<{ id: string }>();
  if (row && row.id !== userId) return { available: false, error: 'That username is not available.' };
  return { available: true };
}

export async function setUsername(
  db: D1Database,
  userId: string,
  raw: string,
): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const rejection = usernameRejection(raw);
  if (rejection) return { ok: false, error: rejection };
  const name = normalizeUsername(raw);
  const current = await db.prepare('SELECT username FROM users WHERE id = ?').bind(userId).first<{ username: string | null }>();
  if (current?.username === name) return { ok: true, username: name };
  const taken = await usernameAvailable(db, name, userId);
  if (!taken.available) return { ok: false, error: taken.error ?? 'That username is not available.' };
  try {
    await db.prepare('UPDATE users SET username = ? WHERE id = ?').bind(name, userId).run();
  } catch (error) {
    if (error instanceof Error && /unique/i.test(error.message)) return { ok: false, error: 'That username is not available.' };
    throw error;
  }
  await db.prepare('UPDATE shares SET creator_name = ? WHERE user_id = ? AND revoked_at IS NULL').bind(name, userId).run();
  const shares = await db.prepare('SELECT id FROM shares WHERE user_id = ? AND revoked_at IS NULL').bind(userId).all<{ id: string }>();
  for (const share of shares.results ?? []) {
    await syncSearchRow(db, share.id);
  }
  return { ok: true, username: name };
}
