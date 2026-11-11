import type { StorageManager } from '@mui/material/styles';

/**
 * Light and dark mode. The mode is "light", "dark" or "system" (follow the device). MUI
 * tracks it and switches the theme; this file says where the choice is kept and which
 * attribute on <html> selects a scheme. index.html uses the same key and attribute to set
 * the scheme before the app loads (kept in step by indexHtml.test.ts).
 */

/** Versioned, like the app's other stored values. */
export const COLOR_MODE_STORAGE_KEY = 'almanac.colorMode.v1';

/** `<html data-color-scheme="dark">` selects the dark scheme's colors. */
export const COLOR_SCHEME_ATTRIBUTE = 'data-color-scheme';

export type ColorMode = 'light' | 'dark' | 'system';

const isColorMode = (value: unknown): value is ColorMode =>
  value === 'light' || value === 'dark' || value === 'system';

/**
 * Where MUI keeps the mode. Its built-in storage accepts whatever it finds and also stores
 * two extra keys that only matter to apps with several light or dark themes. This one keeps
 * a single key and treats anything that is not a mode as "nothing stored", so stored data
 * that was edited or damaged falls back to following the system.
 */
export const colorModeStorage: StorageManager = ({ key, storageWindow }) => {
  const target = storageWindow ?? window;
  const isModeKey = key === COLOR_MODE_STORAGE_KEY;

  return {
    get(defaultValue: unknown): unknown {
      if (!isModeKey) return defaultValue;
      try {
        const stored = target.localStorage.getItem(key);
        return isColorMode(stored) ? stored : defaultValue;
      } catch {
        // Storage can be blocked (private mode, browser settings).
        return defaultValue;
      }
    },
    set(value: unknown) {
      if (!isModeKey || !isColorMode(value)) return;
      try {
        target.localStorage.setItem(key, value);
      } catch {
        // The choice still applies for this visit; it is just not remembered.
      }
    },
    /** Tells MUI when another tab changes the mode. */
    subscribe(handler: (value: unknown) => void) {
      if (!isModeKey) return () => {};
      const listener = (event: StorageEvent) => {
        if (event.key === key) handler(isColorMode(event.newValue) ? event.newValue : null);
      };
      target.addEventListener('storage', listener);
      return () => target.removeEventListener('storage', listener);
    },
  };
};
