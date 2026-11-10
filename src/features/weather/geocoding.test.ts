import { describe, expect, it } from 'vitest';
import { ParseError } from '../../lib/http';
import { rawGeocoding } from './fixtures';
import { buildGeocodingUrl, parseGeocoding } from './geocoding';
import { DEFAULT_LOCATION, formatLocation, parseStoredLocation } from './locations';

describe('buildGeocodingUrl', () => {
  it('searches Open-Meteo for a few English-named matches', () => {
    const url = new URL(buildGeocodingUrl('Paris'));

    expect(url.origin + url.pathname).toBe('https://geocoding-api.open-meteo.com/v1/search');
    expect(url.searchParams.get('name')).toBe('Paris');
    expect(url.searchParams.get('count')).toBe('6');
    expect(url.searchParams.get('language')).toBe('en');
  });

  it('encodes names with spaces and accents', () => {
    const url = new URL(buildGeocodingUrl('São Paulo'));

    expect(url.searchParams.get('name')).toBe('São Paulo');
  });
});

describe('parseGeocoding', () => {
  it('maps results to locations', () => {
    expect(parseGeocoding(rawGeocoding())[0]).toEqual({
      id: 'geo-2988507',
      name: 'Paris',
      region: 'Île-de-France Region',
      country: 'France',
      latitude: 48.85341,
      longitude: 2.3488,
    });
  });

  it('keeps places that have no region or country', () => {
    const [place] = parseGeocoding({
      results: [{ id: 1, name: 'Nowhere', latitude: 1, longitude: 2 }],
    });

    expect(place).toMatchObject({ name: 'Nowhere', region: '', country: '' });
    expect(place && formatLocation(place)).toBe('Nowhere');
  });

  it('treats a response without results as no matches', () => {
    expect(parseGeocoding({ generationtime_ms: 0.06 })).toEqual([]);
  });

  it('skips malformed results', () => {
    const results = [
      { id: 1, name: 'Good', latitude: 10, longitude: 20 },
      { id: 2, name: 'No coordinates' },
      { id: 3, name: 'Bad latitude', latitude: 'north', longitude: 20 },
      { id: 4, name: 'Off the map', latitude: 95, longitude: 20 },
      { name: 'No id', latitude: 10, longitude: 20 },
      null,
    ];

    expect(parseGeocoding({ results }).map((place) => place.name)).toEqual(['Good']);
  });

  it.each([null, 'text', []])('rejects a payload that is not an object: %o', (payload) => {
    expect(() => parseGeocoding(payload)).toThrow(ParseError);
  });
});

describe('parseStoredLocation', () => {
  it('accepts a complete location', () => {
    expect(parseStoredLocation({ ...DEFAULT_LOCATION })).toEqual(DEFAULT_LOCATION);
  });

  it.each([
    ['nothing', null],
    ['a string', 'Fene'],
    ['a missing name', { ...DEFAULT_LOCATION, name: undefined }],
    ['an empty name', { ...DEFAULT_LOCATION, name: '' }],
    ['a text latitude', { ...DEFAULT_LOCATION, latitude: '43.45' }],
    ['a latitude off the map', { ...DEFAULT_LOCATION, latitude: 91 }],
    ['a longitude off the map', { ...DEFAULT_LOCATION, longitude: -181 }],
  ])('rejects %s', (_label, raw) => {
    expect(parseStoredLocation(raw)).toBeUndefined();
  });
});
