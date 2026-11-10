import { createStore } from '../../lib/storage';

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

/** The unit choice, remembered across visits. Until chosen, it follows the browser. */
export const unitStore = createStore<UnitSystem>('almanac.units.v1', {
  parse: (raw) => (raw === 'metric' || raw === 'imperial' ? raw : undefined),
  fallback: () => defaultUnitSystem(navigator.language),
});

export const UNIT_LABELS = {
  metric: { temperature: '°C', precipitation: 'mm', windSpeed: 'km/h' },
  imperial: { temperature: '°F', precipitation: 'in', windSpeed: 'mph' },
} as const satisfies Record<UnitSystem, Record<string, string>>;
