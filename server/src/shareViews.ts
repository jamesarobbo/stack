/**
 * Share page and stack detail views. Deduped per viewer per UTC day.
 * The owner is skipped. Bots and empty user agents are skipped.
 * Anonymous page views use a hashed address. The in-app detail uses the account id.
 */

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  const agent = userAgent?.trim() ?? '';
  if (!agent) return true;
  return /bot|spider|crawler|crawl|slurp|facebookexternalhit|embedly|quora|pinterest|whatsapp|telegram|slackbot|discordbot|skype|linkedinbot|applebot|bingbot|duckduck|baidu|yandex|semrush|ahrefs|petalbot|headless|bytespider|preview/i.test(
    agent,
  );
}

/** Writes one view. Returns false when this viewer was skipped or already counted today. */
export async function recordShareView(
  db: D1Database,
  input: {
    shareId: string;
    ownerId: string;
    viewerId?: string | null;
    addressKey?: string | null;
    userAgent?: string | null;
    now?: Date;
  },
): Promise<boolean> {
  if (isBotUserAgent(input.userAgent)) return false;
  if (input.viewerId && input.viewerId === input.ownerId) return false;
  const viewerKey = input.viewerId ? `user:${input.viewerId}` : input.addressKey ? `ip:${input.addressKey}` : null;
  if (!viewerKey) return false;
  const day = (input.now ?? new Date()).toISOString().slice(0, 10);
  const result = await db
    .prepare('INSERT INTO share_views (share_id, viewer_key, day) VALUES (?, ?, ?) ON CONFLICT(share_id, viewer_key, day) DO NOTHING')
    .bind(input.shareId, viewerKey, day)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}
