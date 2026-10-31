import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState as DeviceState, Platform } from 'react-native';
import { api, stackSyncBody } from './api';
import type { IngredientInput, ProductInput, SampleInput, TagInput, TagKind } from './domain/types';
import { localToday } from './dates';
import {
  addProduct,
  addProducts,
  addReminder as insertReminder,
  addTag,
  clearTaken,
  connectHealth,
  deleteLocalData,
  exportPayload,
  loadExample,
  loadSnapshot,
  markTaken,
  mergeIntakeLogs,
  prepareSettings,
  removeProduct,
  removeReminder as deleteReminder,
  replaceProductsFromSync,
  updateIngredientUnit,
  updateProductPrice,
  updateProductStartDate,
  updateReminder as patchReminder,
  clearUntouchedSampleOnce,
  refreshHealthIfStale,
  type NewProduct,
} from './db/repository';
import type { IntakeLog, Reminder } from '../../shared/reminders';
import { syncSchedule, watchReminders } from './reminders/notify';
import { configurePurchases, purchasePlan, restorePurchases, revenueCatIsPro, type PurchaseResult } from './purchases';
import { syncProfile } from './data/profile';
import { flushPendingCopies, submitCopierResults } from './data/sharing';
import { ensureCurrency, getCurrency } from './money';
import { isCurrency } from '../../shared/money';
import { getSetting, setSetting } from './settings';
import { initTelemetry, track } from './telemetry';

type AppState = {
  ready: boolean;
  bootError: string | null;
  products: ProductInput[];
  samples: SampleInput[];
  tags: TagInput[];
  reminders: Reminder[];
  logs: IntakeLog[];
  displayName: string;
  usingSampleData: boolean;
  healthSource: string | null;
  onboardingComplete: boolean;
  isPro: boolean;
  previewPro: boolean;
  sessionToken: string | null;
  email: string | null;
  currency: string;
  syncNote: string | null;
  refresh: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  connectWearable: () => Promise<string>;
  addManual: (input: {
    name: string;
    brand?: string | null;
    note?: string | null;
    priceCents: number;
    servingsPerContainer: number;
    servingsPerDay: number;
    startDate: string;
    catalogueId?: string | null;
    ingredients: IngredientInput[];
  }) => Promise<void>;
  /** Adds the chosen products in one transaction, replacing the given ids. */
  addMany: (list: NewProduct[], replaceIds: string[]) => Promise<void>;
  /** Re-reads Apple Health when the last read is stale, then sends any copier results that are due. */
  backgroundRefresh: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  setStartDate: (id: string, startDate: string) => Promise<void>;
  setIngredientUnit: (productId: string, key: string, name: string, unit: string) => Promise<void>;
  setPrice: (id: string, priceCents: number) => Promise<void>;
  addReminder: (productId: string, time: string, days: string) => Promise<void>;
  updateReminder: (id: string, patch: { time?: string; days?: string }) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  toggleTaken: (productId: string, day: string, taken: boolean) => Promise<void>;
  setCurrency: (code: string) => Promise<void>;
  logTag: (kind: TagKind) => Promise<void>;
  setPreviewPro: (on: boolean) => Promise<void>;
  setName: (name: string) => Promise<void>;
  exportData: () => Promise<string>;
  deleteLocal: () => Promise<void>;
  restoreExample: () => Promise<void>;
  sendEmailCode: (email: string) => Promise<string | null>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  uploadStack: () => Promise<void>;
  downloadStack: () => Promise<void>;
  buy: (plan: 'annual' | 'monthly') => Promise<PurchaseResult>;
  restore: () => Promise<boolean>;
};

const Ctx = createContext<AppState | null>(null);

function readFlags() {
  return {
    displayName: getSetting('displayName') ?? '',
    usingSampleData: getSetting('usingSampleData') === '1',
    healthSource: getSetting('healthSource'),
    onboardingComplete: getSetting('onboardingComplete') === '1',
    previewPro: getSetting('previewPro') === '1',
    sessionToken: getSetting('sessionToken'),
    email: getSetting('email'),
    currency: getCurrency(),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductInput[]>([]);
  const [samples, setSamples] = useState<SampleInput[]>([]);
  const [tags, setTags] = useState<TagInput[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [logs, setLogs] = useState<IntakeLog[]>([]);
  const [flags, setFlags] = useState(readFlags);
  const [rcPro, setRcPro] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const applySnapshot = useCallback(async () => {
    const snapshot = await loadSnapshot();
    setProducts(snapshot.products);
    setSamples(snapshot.samples);
    setTags(snapshot.tags);
    setReminders(snapshot.reminders);
    setLogs(snapshot.logs);
    setFlags(readFlags());
    return snapshot;
  }, []);

  const pushSilent = useCallback(async (next: ProductInput[]) => {
    const token = getSetting('sessionToken');
    if (!token) return;
    try {
      await api('/v1/sync/stack', { method: 'PUT', token, body: stackSyncBody(next) });
      setSyncNote(null);
    } catch (error) {
      setSyncNote(error instanceof Error ? error.message : 'Sync failed');
    }
  }, []);

  const refresh = useCallback(async () => {
    await applySnapshot();
    setRcPro(await revenueCatIsPro());
  }, [applySnapshot]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await prepareSettings();
        await ensureCurrency();
        await clearUntouchedSampleOnce();
        if (cancelled) return;
        await applySnapshot();
        await initTelemetry();
        await configurePurchases(getSetting('userId'));
        setRcPro(await revenueCatIsPro());
        if (!cancelled) setReady(true);
      } catch (error) {
        if (!cancelled) setBootError(error instanceof Error ? error.message : 'The app could not start.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySnapshot]);

  const pushIntake = useCallback(async (body: { logs?: IntakeLog[]; removed?: { productId: string; day: string }[] }) => {
    const token = getSetting('sessionToken');
    if (!token) return;
    try {
      await api('/v1/sync/intake', { method: 'PUT', token, body });
      setSyncNote(null);
    } catch (error) {
      setSyncNote(error instanceof Error ? error.message : 'Sync failed');
    }
  }, []);

  const pullIntake = useCallback(async () => {
    const token = getSetting('sessionToken');
    if (!token) return;
    const result = await api<{ logs: IntakeLog[] }>('/v1/sync/intake', { token });
    await mergeIntakeLogs(result.logs ?? []);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void (async () => {
      if (getSetting('sessionToken')) {
        await pullIntake().catch(() => undefined);
        if (!cancelled) await applySnapshot();
      }
      const snapshot = await loadSnapshot();
      await syncSchedule(snapshot.reminders, snapshot.products);
    })();
    const stop = watchReminders((event) => {
      void (async () => {
        if (event.taken) {
          const day = localToday();
          for (const productId of event.productIds) {
            const log = await markTaken(productId, day);
            await pushIntake({ logs: [log] });
          }
          await applySnapshot();
        }
        router.push('/today');
      })();
    });
    const subscription = DeviceState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void loadSnapshot().then((snapshot) => syncSchedule(snapshot.reminders, snapshot.products));
    });
    return () => {
      cancelled = true;
      stop();
      subscription.remove();
    };
  }, [applySnapshot, pullIntake, pushIntake, ready]);

  const afterWrite = useCallback(async () => {
    const snapshot = await applySnapshot();
    await pushSilent(snapshot.products);
    await syncSchedule(snapshot.reminders, snapshot.products);
  }, [applySnapshot, pushSilent]);

  const value = useMemo<AppState>(() => {
    const isPro = flags.previewPro || rcPro;
    return {
      ready,
      bootError,
      products,
      samples,
      tags,
      reminders,
      logs,
      ...flags,
      isPro,
      syncNote,
      refresh,
      completeOnboarding: async () => {
        await setSetting('onboardingComplete', '1');
        track('onboarding_complete');
        await applySnapshot();
      },
      connectWearable: async () => {
        const message = await connectHealth();
        track('health_connect');
        await applySnapshot();
        return message;
      },
      addManual: async (input) => {
        await addProduct(input);
        await afterWrite();
      },
      addMany: async (list, replaceIds) => {
        await addProducts(list, { replaceIds });
        await afterWrite();
      },
      backgroundRefresh: async () => {
        if (await refreshHealthIfStale().catch(() => false)) await applySnapshot();
        const snapshot = await loadSnapshot();
        const token = getSetting('sessionToken');
        await flushPendingCopies(token, snapshot.products).catch(() => undefined);
        await submitCopierResults(token, snapshot.samples).catch(() => undefined);
      },
      remove: async (id) => {
        await removeProduct(id);
        await afterWrite();
      },
      setStartDate: async (id, startDate) => {
        await updateProductStartDate(id, startDate);
        await afterWrite();
      },
      setIngredientUnit: async (productId, key, name, unit) => {
        await updateIngredientUnit(productId, key, name, unit);
        await afterWrite();
      },
      setPrice: async (id, priceCents) => {
        await updateProductPrice(id, priceCents, getCurrency());
        await afterWrite();
      },
      addReminder: async (productId, time, days) => {
        await insertReminder(productId, time, days);
        const snapshot = await applySnapshot();
        await syncSchedule(snapshot.reminders, snapshot.products);
      },
      updateReminder: async (id, patch) => {
        await patchReminder(id, patch);
        const snapshot = await applySnapshot();
        await syncSchedule(snapshot.reminders, snapshot.products);
      },
      removeReminder: async (id) => {
        await deleteReminder(id);
        const snapshot = await applySnapshot();
        await syncSchedule(snapshot.reminders, snapshot.products);
      },
      toggleTaken: async (productId, day, taken) => {
        if (taken) {
          await clearTaken(productId, day);
          await pushIntake({ removed: [{ productId, day }] });
        } else {
          const log = await markTaken(productId, day);
          await pushIntake({ logs: [log] });
        }
        await applySnapshot();
      },
      setCurrency: async (code) => {
        if (!isCurrency(code) || code === getCurrency()) return;
        await setSetting('currency', code);
        await applySnapshot();
        await syncProfile(getSetting('sessionToken')).catch(() => undefined);
      },
      logTag: async (kind) => {
        await addTag(kind);
        await applySnapshot();
      },
      setPreviewPro: async (on) => {
        await setSetting('previewPro', on ? '1' : '0');
        await applySnapshot();
      },
      setName: async (name) => {
        await setSetting('displayName', name.trim());
        await applySnapshot();
        await syncProfile(getSetting('sessionToken')).catch(() => undefined);
      },
      exportData: async () => JSON.stringify(await exportPayload(), null, 2),
      deleteLocal: async () => {
        await deleteLocalData();
        await ensureCurrency();
        setRcPro(false);
        await applySnapshot();
        await syncSchedule([], []);
      },
      restoreExample: async () => {
        await loadExample();
        const snapshot = await applySnapshot();
        await syncSchedule(snapshot.reminders, snapshot.products);
      },
      sendEmailCode: async (email) => {
        const result = await api<{ devCode?: string }>('/v1/auth/email/start', {
          method: 'POST',
          body: { email },
        });
        return result.devCode ?? null;
      },
      verifyEmailCode: async (email, code) => {
        const result = await api<{ token: string; user: { id: string; email: string | null } }>('/v1/auth/email/verify', {
          method: 'POST',
          body: { email, code },
        });
        await setSetting('sessionToken', result.token);
        await setSetting('userId', result.user.id);
        if (result.user.email) await setSetting('email', result.user.email);
        await configurePurchases(result.user.id);
        await applySnapshot();
        await syncProfile(result.token).catch(() => undefined);
        await pushSilent(products);
        await pullIntake().catch(() => undefined);
        await applySnapshot();
        await flushPendingCopies(result.token, products).catch(() => undefined);
        const snapshot = await loadSnapshot();
        await syncSchedule(snapshot.reminders, snapshot.products);
        track('sign_in', { method: 'email' });
      },
      signInWithApple: async () => {
        if (Platform.OS !== 'ios') throw new Error('Sign in with Apple is available on iPhone.');
        const Apple = await import('expo-apple-authentication');
        const Crypto = await import('expo-crypto');
        const rawNonce = Crypto.randomUUID();
        const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce, {
          encoding: Crypto.CryptoEncoding.HEX,
        });
        const credential = await Apple.signInAsync({
          requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL],
          nonce: hashedNonce,
        });
        if (!credential.identityToken) throw new Error('Apple did not return an identity token.');
        const result = await api<{ token: string; user: { id: string; email: string | null } }>('/v1/auth/apple', {
          method: 'POST',
          body: { identityToken: credential.identityToken, rawNonce },
        });
        await setSetting('sessionToken', result.token);
        await setSetting('userId', result.user.id);
        if (result.user.email) await setSetting('email', result.user.email);
        await configurePurchases(result.user.id);
        await applySnapshot();
        await syncProfile(result.token).catch(() => undefined);
        await pushSilent(products);
        await pullIntake().catch(() => undefined);
        await applySnapshot();
        await flushPendingCopies(result.token, products).catch(() => undefined);
        const snapshot = await loadSnapshot();
        await syncSchedule(snapshot.reminders, snapshot.products);
        track('sign_in', { method: 'apple' });
      },
      signOut: async () => {
        const token = getSetting('sessionToken');
        if (token) {
          await api('/v1/auth/signout', { method: 'POST', token }).catch(() => undefined);
        }
        await setSetting('sessionToken', '');
        await setSetting('userId', '');
        await setSetting('email', '');
        await applySnapshot();
        const snapshot = await loadSnapshot();
        await syncSchedule(snapshot.reminders, snapshot.products);
      },
      deleteAccount: async () => {
        const token = getSetting('sessionToken');
        if (!token) return;
        await api('/v1/account', { method: 'DELETE', token });
        await setSetting('sessionToken', '');
        await setSetting('userId', '');
        await setSetting('email', '');
        await applySnapshot();
        const snapshot = await loadSnapshot();
        await syncSchedule(snapshot.reminders, snapshot.products);
      },
      uploadStack: async () => {
        await pushSilent(products);
      },
      downloadStack: async () => {
        const token = getSetting('sessionToken');
        if (!token) throw new Error('Sign in first.');
        const result = await api<{ products: ProductInput[] }>('/v1/sync/stack', { token });
        await replaceProductsFromSync(result.products ?? []);
        const snapshot = await applySnapshot();
        await syncSchedule(snapshot.reminders, snapshot.products);
      },
      buy: async (plan) => {
        const result = await purchasePlan(plan);
        if (result === 'purchased') setRcPro(true);
        track('purchase_attempt', { plan, result });
        return result;
      },
      restore: async () => {
        const restored = await restorePurchases();
        if (restored) setRcPro(true);
        return restored;
      },
    };
  }, [afterWrite, applySnapshot, bootError, flags, logs, products, pullIntake, pushIntake, pushSilent, rcPro, ready, refresh, reminders, samples, syncNote, tags]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const value = useContext(Ctx);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
