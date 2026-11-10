import { createStore } from '../../lib/storage';

/** A place to show weather for. Coordinates from Open-Meteo geocoding. */
export type Location = {
  id: string;
  name: string;
  /** State, province or oblast; tells apart places with the same name. */
  region: string;
  country: string;
  latitude: number;
  longitude: number;
};

export const PRESET_LOCATIONS: readonly Location[] = [
  {
    id: 'fene-es',
    name: 'Fene',
    region: 'Galicia',
    country: 'Spain',
    latitude: 43.45,
    longitude: -8.15,
  },
  {
    // The town in Lviv Oblast, not the smaller one in Kharkiv Oblast.
    id: 'zolochiv-ua',
    name: 'Zolochiv',
    region: 'Lviv Oblast',
    country: 'Ukraine',
    latitude: 49.8074,
    longitude: 24.90376,
  },
  {
    id: 'cody-us',
    name: 'Cody',
    region: 'Wyoming',
    country: 'United States',
    latitude: 44.52634,
    longitude: -109.05653,
  },
];

// The list is a non-empty literal above.
export const DEFAULT_LOCATION = PRESET_LOCATIONS[0] as Location;

const isText = (value: unknown): value is string => typeof value === 'string';
const isWithin = (value: unknown, limit: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;

/** Validates a place read back from storage; anything incomplete or off the map is dropped. */
export function parseStoredLocation(raw: unknown): Location | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const { id, name, region, country, latitude, longitude } = raw as Record<string, unknown>;

  if (!isText(id) || !isText(name) || name === '') return undefined;
  if (!isText(region) || !isText(country)) return undefined;
  if (!isWithin(latitude, 90) || !isWithin(longitude, 180)) return undefined;

  return { id, name, region, country, latitude, longitude };
}

/** The place weather is shown for, remembered across visits. */
export const locationStore = createStore<Location>('almanac.location.v1', {
  parse: parseStoredLocation,
  fallback: () => DEFAULT_LOCATION,
});

export function formatLocation({ name, region, country }: Location): string {
  return [name, region, country].filter(Boolean).join(', ');
}
