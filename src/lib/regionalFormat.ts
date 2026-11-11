import { createStore } from './storage';

/**
 * One choice between two sets of conventions:
 *
 * - imperial: °F, mph, inches, month-first dates and a 12-hour clock, as in the US;
 * - metric: °C, km/h, millimetres, day-first dates and a 24-hour clock, as nearly
 *   everywhere else.
 *
 * Units and date format go together because people who want one almost always want the
 * other, and a single switch is easier to find than two. Until someone chooses, everything
 * follows the browser's language.
 */
export type UnitSystem = 'metric' | 'imperial';

/** Regions that use Fahrenheit day to day: the US and its territories, and a few others. */
const FAHRENHEIT_REGIONS = new Set([
  'US',
  'PR',
  'GU',
  'VI',
  'AS',
  'MP',
  'UM',
  'BS',
  'BZ',
  'KY',
  'PW',
  'FM',
  'MH',
  'LR',
]);

/**
 * The unit system people in the browser's region expect. "en" alone resolves to the US,
 * as browsers do. A malformed language tag gets metric, the global default.
 */
export function defaultUnitSystem(language: string): UnitSystem {
  try {
    const { region } = new Intl.Locale(language).maximize();
    return region && FAHRENHEIT_REGIONS.has(region) ? 'imperial' : 'metric';
  } catch {
    return 'metric';
  }
}

/** The choice, remembered across visits. Until chosen, it follows the browser. */
export const unitStore = createStore<UnitSystem>('almanac.units.v1', {
  parse: (raw) => (raw === 'metric' || raw === 'imperial' ? raw : undefined),
  fallback: () => defaultUnitSystem(navigator.language),
});

/** The languages whose formats stand for each side when the browser's own does not fit. */
const STANDARD_LANGUAGE: Record<UnitSystem, string> = { imperial: 'en-US', metric: 'en-GB' };

/**
 * The language dates, times and numbers are written in. It is the browser's own while the
 * choice matches what that browser's region uses anyway, so a Spanish browser on °C keeps
 * Spanish dates. Choosing the other side switches to that side's standard: US English for
 * imperial, British English for metric.
 */
export function formatLanguage(): string {
  const browserLanguage = navigator.language;
  const units = unitStore.get();
  return units === defaultUnitSystem(browserLanguage) ? browserLanguage : STANDARD_LANGUAGE[units];
}
