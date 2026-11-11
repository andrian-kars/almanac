import type { UnitSystem } from '../../lib/regionalFormat';

/**
 * How the weather's units are written. The choice between them lives in
 * lib/regionalFormat.ts, because the date format follows it too.
 */
export const UNIT_LABELS = {
  metric: { temperature: '°C', precipitation: 'mm', windSpeed: 'km/h' },
  imperial: { temperature: '°F', precipitation: 'in', windSpeed: 'mph' },
} as const satisfies Record<UnitSystem, Record<string, string>>;
