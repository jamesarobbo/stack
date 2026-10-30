export type DriverKind = 'localStorage' | 'memory';

export type SettingsDriver = {
  kind: DriverKind;
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  entries(): [string, string][];
  clear(): void;
};

const PREFIX = 'stack.settings.';

export function createDriver(): SettingsDriver {
  const storage = typeof localStorage === 'undefined' ? null : localStorage;
  if (!storage) {
    const memory = new Map<string, string>();
    return {
      kind: 'memory',
      get: (key) => memory.get(key) ?? null,
      set: (key, value) => memory.set(key, value),
      remove: (key) => memory.delete(key),
      entries: () => [...memory.entries()],
      clear: () => memory.clear(),
    };
  }
  return {
    kind: 'localStorage',
    get: (key) => storage.getItem(PREFIX + key),
    set: (key, value) => {
      storage.setItem(PREFIX + key, value);
    },
    remove: (key) => {
      storage.removeItem(PREFIX + key);
    },
    entries: () =>
      Object.keys(storage)
        .filter((key) => key.startsWith(PREFIX))
        .map((key) => [key.slice(PREFIX.length), storage.getItem(key) ?? '']),
    clear: () => {
      for (const key of Object.keys(storage)) {
        if (key.startsWith(PREFIX)) storage.removeItem(key);
      }
    },
  };
}
