import { randomId } from './crypto';

export type WaitlistInsert = {
  email: string;
  source: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: string;
};

/** Inserts a waitlist row. Returns created when new, exists when the email was already listed. */
export async function upsertWaitlist(
  db: D1Database,
  input: WaitlistInsert,
): Promise<'created' | 'exists'> {
  const existing = await db
    .prepare('SELECT id FROM waitlist WHERE email = ? COLLATE NOCASE')
    .bind(input.email)
    .first<{ id: string }>();
  if (existing) return 'exists';
  try {
    await db
      .prepare(
        `INSERT INTO waitlist (id, email, created_at, source, utm_source, utm_medium, utm_campaign)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        randomId(),
        input.email,
        input.createdAt,
        input.source,
        input.utmSource,
        input.utmMedium,
        input.utmCampaign,
      )
      .run();
    return 'created';
  } catch {
    // Race on the unique email index: treat as already listed.
    return 'exists';
  }
}

export async function waitlistCount(db: D1Database): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM waitlist').first<{ n: number }>();
  return Number(row?.n ?? 0);
}

export function clipField(value: unknown, max = 120): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}
