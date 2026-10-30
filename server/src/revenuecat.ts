export type RevenueCatEvent = {
  type?: string;
  app_user_id?: string;
  entitlement_ids?: string[] | null;
  product_id?: string | null;
  expiration_at_ms?: number | null;
  store?: string | null;
};

export type SubscriptionWrite = {
  userId: string;
  entitlement: 'pro';
  status: 'active' | 'canceled' | 'expired';
  productId: string | null;
  store: string | null;
  expiresAt: string | null;
  revenuecatAppUserId: string;
};

const ACTIVE = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE', 'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED']);

export function subscriptionFromEvent(event: RevenueCatEvent, now = Date.now()): SubscriptionWrite | null {
  const userId = event.app_user_id?.trim();
  if (!userId) return null;
  const entitlements = event.entitlement_ids ?? [];
  if (!entitlements.includes('pro') && event.type !== 'EXPIRATION') return null;
  let status: SubscriptionWrite['status'] = 'expired';
  if (event.type === 'EXPIRATION') status = 'expired';
  else if (event.type === 'CANCELLATION') status = 'canceled';
  else if (event.type && ACTIVE.has(event.type)) status = 'active';
  else if (entitlements.includes('pro')) status = 'active';
  const expiresAt = typeof event.expiration_at_ms === 'number' ? new Date(event.expiration_at_ms).toISOString() : null;
  if (status === 'active' && expiresAt && Date.parse(expiresAt) <= now) status = 'expired';
  return {
    userId,
    entitlement: 'pro',
    status,
    productId: event.product_id ?? null,
    store: event.store ?? null,
    expiresAt,
    revenuecatAppUserId: userId,
  };
}

export function subscriptionIsPro(row: { status: string; expires_at: string | null } | null, now = Date.now()): boolean {
  if (!row) return false;
  if (row.status !== 'active' && row.status !== 'canceled') return false;
  if (!row.expires_at) return row.status === 'active';
  return Date.parse(row.expires_at) > now;
}
