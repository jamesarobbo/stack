import Constants from 'expo-constants';

export type DriverKind = 'mmkv' | 'memory';

export type SettingsDriver = {
  kind: DriverKind;
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  entries(): [string, string][];
  clear(): void;
};

type MmkvLike = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): boolean;
  getAllKeys(): string[];
  clearAll(): void;
};

const memory = new Map<string, string>();

function memoryDriver(): SettingsDriver {
  return {
    kind: 'memory',
    get: (key) => memory.get(key) ?? null,
    set: (key, value) => {
      memory.set(key, value);
    },
    remove: (key) => {
      memory.delete(key);
    },
    entries: () => [...memory.entries()],
    clear: () => {
      memory.clear();
    },
  };
}

function wrapMmkv(mmkv: MmkvLike): SettingsDriver {
  return {
    kind: 'mmkv',
    get: (key) => mmkv.getString(key) ?? null,
    set: (key, value) => {
      mmkv.set(key, value);
    },
    remove: (key) => {
      mmkv.remove(key);
    },
    entries: () => mmkv.getAllKeys().map((key) => [key, mmkv.getString(key) ?? '']),
    clear: () => {
      mmkv.clearAll();
    },
  };
}

export function createDriver(): SettingsDriver {
  if (Constants.executionEnvironment === 'storeClient') return memoryDriver();
  try {
    const { createMMKV } = require('react-native-mmkv') as {
      createMMKV: (config?: { id?: string }) => MmkvLike;
    };
    return wrapMmkv(createMMKV({ id: 'stack-settings' }));
  } catch {
    return memoryDriver();
  }
}
