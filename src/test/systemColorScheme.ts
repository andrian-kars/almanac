import { act } from '@testing-library/react';
import { vi } from 'vitest';

type Scheme = 'light' | 'dark';
type ChangeListener = (event: MediaQueryListEvent) => void;

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Gives the test a system color scheme (jsdom has no matchMedia at all). Other media queries
 * never match. `set` changes the preference later, as when the OS switches at sunset, and
 * tells everyone who is listening.
 */
export function mockSystemColorScheme(initial: Scheme) {
  let scheme = initial;
  const listeners = new Set<ChangeListener>();

  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => {
    const isSchemeQuery = query === DARK_QUERY;
    const add = (listener: ChangeListener) => {
      if (isSchemeQuery) listeners.add(listener);
    };
    const remove = (listener: ChangeListener) => {
      listeners.delete(listener);
    };

    return {
      get matches() {
        return isSchemeQuery && scheme === 'dark';
      },
      media: query,
      onchange: null,
      // Only the "change" event exists on a media query list.
      addEventListener: (_type: string, listener: ChangeListener) => add(listener),
      removeEventListener: (_type: string, listener: ChangeListener) => remove(listener),
      // The older pair, which MUI still uses for old browsers.
      addListener: add,
      removeListener: remove,
      dispatchEvent: () => false,
    } as MediaQueryList;
  });

  return {
    set(next: Scheme) {
      scheme = next;
      const event = { matches: next === 'dark', media: DARK_QUERY } as MediaQueryListEvent;
      act(() => {
        for (const listener of [...listeners]) listener(event);
      });
    },
  };
}
