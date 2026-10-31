import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { PRO_ENTITLEMENT, REVENUECAT_ANNUAL_PRODUCT, REVENUECAT_IOS_KEY, REVENUECAT_MONTHLY_PRODUCT } from './config';

type CustomerInfo = { entitlements: { active: Record<string, unknown> } };
type PurchasesSdk = {
  configure: (options: { apiKey: string; appUserID?: string }) => void;
  logIn: (appUserId: string) => Promise<{ customerInfo: CustomerInfo }>;
  getCustomerInfo: () => Promise<CustomerInfo>;
  getOfferings: () => Promise<{
    current?: { availablePackages: { product: { identifier: string }; }[] } | null;
  }>;
  purchasePackage: (pkg: { product: { identifier: string } }) => Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases: () => Promise<CustomerInfo>;
};

export type PurchaseResult = 'unavailable' | 'purchased' | 'cancelled';

function sdk(): PurchasesSdk | null {
  if (Platform.OS !== 'ios' || !REVENUECAT_IOS_KEY) return null;
  if (Constants.executionEnvironment === 'storeClient') return null;
  try {
    return require('react-native-purchases').default as PurchasesSdk;
  } catch {
    return null;
  }
}

export function purchasesAvailable(): boolean {
  return sdk() != null;
}

export async function configurePurchases(appUserId?: string | null) {
  const purchases = sdk();
  if (!purchases) return;
  purchases.configure({ apiKey: REVENUECAT_IOS_KEY, appUserID: appUserId || undefined });
}

export async function revenueCatIsPro(): Promise<boolean> {
  const purchases = sdk();
  if (!purchases) return false;
  try {
    const info = await purchases.getCustomerInfo();
    return Boolean(info.entitlements.active[PRO_ENTITLEMENT]);
  } catch {
    return false;
  }
}

export async function purchasePlan(plan: 'annual' | 'monthly'): Promise<PurchaseResult> {
  const purchases = sdk();
  if (!purchases) return 'unavailable';
  const offerings = await purchases.getOfferings();
  const productId = plan === 'annual' ? REVENUECAT_ANNUAL_PRODUCT : REVENUECAT_MONTHLY_PRODUCT;
  const pkg = offerings.current?.availablePackages.find((item) => item.product.identifier === productId);
  if (!pkg) return 'unavailable';
  try {
    const result = await purchases.purchasePackage(pkg);
    return result.customerInfo.entitlements.active[PRO_ENTITLEMENT] ? 'purchased' : 'cancelled';
  } catch (error) {
    if (error && typeof error === 'object' && 'userCancelled' in error && error.userCancelled) return 'cancelled';
    throw error;
  }
}

export async function restorePurchases(): Promise<boolean> {
  const purchases = sdk();
  if (!purchases) return false;
  const info = await purchases.restorePurchases();
  return Boolean(info.entitlements.active[PRO_ENTITLEMENT]);
}
