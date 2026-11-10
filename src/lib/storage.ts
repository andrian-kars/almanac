import { useSyncExternalStore } from 'react';

/**
 * A small persisted value in localStorage, readable from React with `useStoredValue`.
 *
 * - Stored data is untrusted (old versions, manual edits), so every read goes through
 *   `parse`; anything it rejects falls back to `fallback()`.
 * - Reads return the same object until the stored value changes, as React requires.
 * - Changes in other tabs arrive through the `storage` event.
 * - If storage is blocked or full (private mode, quota), the value still works in memory
 *   for this page; it just isn't remembered.
 */
export type Store<T> = {
  get: () => T;
  set: (value: T) => void;
  subscribe: (onChange: () => void) => () => void;
};

type StoreOptions<T> = {
  /** Returns the value if `raw` (already JSON-parsed) is valid, otherwise undefined. */
  parse: (raw: unknown) => T | undefined;
  /** Used when nothing valid is stored. Called on read, so it may depend on the browser. */
  fallback: () => T;
};

export function createStore<T>(key: string, { parse, fallback }: StoreOptions<T>): Store<T> {
  const listeners = new Set<() => void>();
  /** Last value set while storage was unavailable. */
  let memory: { value: T } | undefined;
  /** Cache, so an unchanged source returns the identical value. */
  let cached: { source: string; value: T } | undefined;

  function fromCache(source: string, compute: () => T): T {
    if (cached?.source === source) return cached.value;
    const value = compute();
    cached = { source, value };
    return value;
  }

  function readStored(raw: string): T | undefined {
    try {
      return parse(JSON.parse(raw));
    } catch {
      return undefined;
    }
  }

  function get(): T {
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      if (memory) return memory.value;
      raw = null;
    }

    if (raw !== null) {
      const stored = readStored(raw);
      if (stored !== undefined) return fromCache(`stored:${raw}`, () => stored);
    }

    const value = fallback();
    // Keyed by content, so a fallback that changes (e.g. with the browser language) shows.
    return fromCache(`fallback:${JSON.stringify(value)}`, () => value);
  }

  function notify() {
    for (const listener of listeners) listener();
  }

  function onStorage(event: StorageEvent) {
    // A null key means another tab cleared all storage.
    if (event.key === key || event.key === null) notify();
  }

  return {
    get,
    set(value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        memory = undefined;
      } catch {
        memory = { value };
      }
      notify();
    },
    subscribe(onChange) {
      if (listeners.size === 0) window.addEventListener('storage', onStorage);
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) window.removeEventListener('storage', onStorage);
      };
    },
  };
}

/** The current value of `store`, re-rendering when it changes here or in another tab. */
export function useStoredValue<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get);
}
