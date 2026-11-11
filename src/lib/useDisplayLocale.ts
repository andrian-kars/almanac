import { getDisplayLocale } from './date';
import { unitStore } from './regionalFormat';
import { useStoredValue } from './storage';

/**
 * The locale to format dates, times and numbers in, for components: they render again when
 * the units and date format choice changes (here or in another tab).
 */
export function useDisplayLocale(): string {
  // Subscribes to the choice; the locale itself is worked out from it and the browser.
  useStoredValue(unitStore);
  return getDisplayLocale();
}
