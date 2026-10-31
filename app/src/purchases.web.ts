export type PurchaseResult = 'unavailable' | 'purchased' | 'cancelled';

export function purchasesAvailable(): boolean {
  return false;
}

export async function configurePurchases(_appUserId?: string | null) {}

export async function revenueCatIsPro(): Promise<boolean> {
  return false;
}

export async function purchasePlan(_plan: 'annual' | 'monthly'): Promise<PurchaseResult> {
  return 'unavailable';
}

export async function restorePurchases(): Promise<boolean> {
  return false;
}
