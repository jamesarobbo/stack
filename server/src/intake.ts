export type IntakeRow = {
  id: string;
  productId: string;
  day: string;
  takenAt: string;
};

export type IntakeRemoval = {
  productId: string;
  day: string;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > max) return null;
  return trimmed;
}

/** Taken ticks only: a product and a calendar day. No dose and no schedule. */
export function parseIntake(body: unknown): { logs: IntakeRow[]; removed: IntakeRemoval[] } | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as { logs?: unknown; removed?: unknown };
  const logsIn = raw.logs ?? [];
  const removedIn = raw.removed ?? [];
  if (!Array.isArray(logsIn) || !Array.isArray(removedIn)) return null;
  if (logsIn.length > 500 || removedIn.length > 500) return null;
  const logs: IntakeRow[] = [];
  for (const item of logsIn) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    const id = text(row.id, 80);
    const productId = text(row.productId, 80);
    const day = text(row.day, 10);
    const takenAt = text(row.takenAt, 40);
    if (!id || !productId || !day || !DAY.test(day) || !takenAt) return null;
    logs.push({ id, productId, day, takenAt });
  }
  const removed: IntakeRemoval[] = [];
  for (const item of removedIn) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    const productId = text(row.productId, 80);
    const day = text(row.day, 10);
    if (!productId || !day || !DAY.test(day)) return null;
    removed.push({ productId, day });
  }
  return { logs, removed };
}
