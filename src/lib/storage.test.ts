import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createStore, useStoredValue } from './storage';

type Prefs = { size: number };

const parsePrefs = (raw: unknown): Prefs | undefined =>
  typeof raw === 'object' && raw !== null && 'size' in raw && typeof raw.size === 'number'
    ? { size: raw.size }
    : undefined;

let counter = 0;
/** A store with a fresh key, so tests never share state. */
function makeStore(fallback: () => Prefs = () => ({ size: 1 })) {
  counter += 1;
  const key = `test.prefs.${counter}`;
  return { key, store: createStore<Prefs>(key, { parse: parsePrefs, fallback }) };
}

describe('createStore', () => {
  it('returns the fallback when nothing is stored', () => {
    const { store } = makeStore();

    expect(store.get()).toEqual({ size: 1 });
  });

  it('reads a stored value', () => {
    const { key, store } = makeStore();
    localStorage.setItem(key, JSON.stringify({ size: 5 }));

    expect(store.get()).toEqual({ size: 5 });
  });

  it('saves a value as JSON', () => {
    const { key, store } = makeStore();

    store.set({ size: 7 });

    expect(JSON.parse(localStorage.getItem(key) ?? 'null')).toEqual({ size: 7 });
    expect(store.get()).toEqual({ size: 7 });
  });

  it.each([
    ['broken JSON', '{"size": 5'],
    ['the wrong shape', '{"width": 5}'],
    ['the wrong type', '"big"'],
  ])('falls back when the stored value is %s', (_label, raw) => {
    const { key, store } = makeStore();
    localStorage.setItem(key, raw);

    expect(store.get()).toEqual({ size: 1 });
  });

  it('returns the same object until the value changes, as React requires', () => {
    const { store } = makeStore();
    store.set({ size: 2 });

    expect(store.get()).toBe(store.get());
  });

  it('returns the same fallback object on repeated reads', () => {
    const { store } = makeStore();

    expect(store.get()).toBe(store.get());
  });

  it('still works in memory when storage is unavailable', () => {
    const { store } = makeStore();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });

    expect(store.get()).toEqual({ size: 1 });
    expect(() => store.set({ size: 3 })).not.toThrow();
    expect(store.get()).toEqual({ size: 3 });
  });
});

describe('useStoredValue', () => {
  it('re-renders when the value is set', () => {
    const { store } = makeStore();
    const { result } = renderHook(() => useStoredValue(store));

    act(() => store.set({ size: 9 }));

    expect(result.current).toEqual({ size: 9 });
  });

  it('follows changes made in another tab', () => {
    const { key, store } = makeStore();
    const { result } = renderHook(() => useStoredValue(store));

    act(() => {
      localStorage.setItem(key, JSON.stringify({ size: 4 }));
      window.dispatchEvent(new StorageEvent('storage', { key }));
    });

    expect(result.current).toEqual({ size: 4 });
  });

  it('ignores storage events for other keys', () => {
    const { store } = makeStore();
    const { result } = renderHook(() => useStoredValue(store));
    const before = result.current;

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'something.else' }));
    });

    expect(result.current).toBe(before);
  });
});
