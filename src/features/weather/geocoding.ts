import { useQuery } from '@tanstack/react-query';
import { fetchJson, ParseError } from '../../lib/http';
import type { Location } from './locations';

/** Open-Meteo place search. https://open-meteo.com/en/docs/geocoding-api */

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const MAX_RESULTS = 6;

/** The API returns nothing for a single letter, so shorter searches are not sent. */
export const MIN_SEARCH_LENGTH = 2;

export function buildGeocodingUrl(name: string): string {
  const params = new URLSearchParams({
    name,
    count: String(MAX_RESULTS),
    language: 'en',
    format: 'json',
  });
  return `${GEOCODING_URL}?${params.toString()}`;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asText = (value: unknown): string => (typeof value === 'string' ? value : '');

const isCoordinate = (value: unknown, limit: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;

/** Maps search results to locations, skipping any without a usable name or position. */
export function parseGeocoding(payload: unknown): Location[] {
  if (!isRecord(payload)) throw new ParseError('Geocoding response is not an object');
  // No matches come back as a response with no `results` key at all.
  const results = Array.isArray(payload.results) ? (payload.results as unknown[]) : [];

  return results.flatMap((raw): Location[] => {
    if (!isRecord(raw)) return [];
    const { id, latitude, longitude } = raw;
    const name = asText(raw.name);
    if (typeof id !== 'number' || name === '') return [];
    if (!isCoordinate(latitude, 90) || !isCoordinate(longitude, 180)) return [];

    return [
      {
        id: `geo-${id}`,
        name,
        region: asText(raw.admin1),
        country: asText(raw.country),
        latitude,
        longitude,
      },
    ];
  });
}

/** Places matching `name`. Idle until the name is long enough to search. */
export function usePlaceSearch(name: string) {
  return useQuery({
    queryKey: ['geocoding', name.toLowerCase()],
    queryFn: async ({ signal }) =>
      parseGeocoding(await fetchJson(buildGeocodingUrl(name), { signal })),
    enabled: name.length >= MIN_SEARCH_LENGTH,
    // Place names and coordinates do not change within a session.
    staleTime: Infinity,
  });
}
