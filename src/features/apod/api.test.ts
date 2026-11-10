import { describe, expect, it, vi } from 'vitest';
import { type IsoDate, parseIsoDate } from '../../lib/date';
import { ParseError } from '../../lib/http';
import { apodPageUrl, buildApodUrl, getApodApiKey, getApodAvailability, parseApod } from './api';
import { rawApod, rawApodPlaceholder, rawApodVideo } from './fixtures';

function iso(value: string): IsoDate {
  const parsed = parseIsoDate(value);
  if (!parsed) throw new Error(`Invalid test date: ${value}`);
  return parsed;
}

describe('getApodApiKey', () => {
  it('uses the key from the environment', () => {
    vi.stubEnv('VITE_NASA_API_KEY', 'my-key');

    expect(getApodApiKey()).toBe('my-key');
  });

  it.each(['', '   '])('falls back to the shared demo key when the key is "%s"', (value) => {
    vi.stubEnv('VITE_NASA_API_KEY', value);

    expect(getApodApiKey()).toBe('DEMO_KEY');
  });
});

describe('buildApodUrl', () => {
  it('asks for one date, with a thumbnail for videos', () => {
    const url = new URL(buildApodUrl(iso('2024-05-01'), 'my-key'));

    expect(url.origin + url.pathname).toBe('https://api.nasa.gov/planetary/apod');
    expect(url.searchParams.get('date')).toBe('2024-05-01');
    expect(url.searchParams.get('thumbs')).toBe('true');
    expect(url.searchParams.get('api_key')).toBe('my-key');
  });
});

describe('getApodAvailability', () => {
  const apodToday = iso('2026-11-10');

  it.each([
    ['1995-06-15', 'before-archive'],
    ['1940-01-01', 'before-archive'],
    ['1995-06-16', 'available'],
    ['2024-05-01', 'available'],
    ['2026-11-10', 'available'],
    ['2026-11-11', 'not-yet'],
    ['2026-11-24', 'not-yet'],
  ])('%s → %s', (date, expected) => {
    expect(getApodAvailability(iso(date), apodToday)).toBe(expected);
  });
});

describe('apodPageUrl', () => {
  it.each([
    ['2024-05-01', 'https://apod.nasa.gov/apod/ap240501.html'],
    ['1995-06-16', 'https://apod.nasa.gov/apod/ap950616.html'],
    ['2000-01-09', 'https://apod.nasa.gov/apod/ap000109.html'],
  ])('%s → %s', (date, expected) => {
    expect(apodPageUrl(iso(date))).toBe(expected);
  });
});

describe('parseApod', () => {
  it('maps an image', () => {
    expect(parseApod(rawApod())).toEqual({
      title: 'A Hole in Mars',
      explanation: expect.stringContaining('What created this unusual hole in Mars?') as string,
      mediaType: 'image',
      url: 'https://apod.nasa.gov/apod/image/2405/MarsHole_1080.jpg',
      hdUrl: 'https://apod.nasa.gov/apod/image/2405/MarsHole_4096.jpg',
      thumbnailUrl: undefined,
      copyright: 'NASA, JPL, U. Arizona',
    });
  });

  it('maps a video with its thumbnail', () => {
    expect(parseApod(rawApodVideo())).toMatchObject({
      mediaType: 'video',
      url: 'https://www.youtube.com/embed/abc123?rel=0',
      thumbnailUrl: 'https://img.youtube.com/vi/abc123/0.jpg',
      copyright: undefined,
    });
  });

  it('treats other media types as "other"', () => {
    expect(parseApod(rawApod({ media_type: 'other', url: undefined }))).toMatchObject({
      mediaType: 'other',
      url: undefined,
    });
  });

  it('trims the explanation', () => {
    expect(parseApod(rawApod({ explanation: '  Text.\t\t ' }))?.explanation).toBe('Text.');
  });

  it('returns null for the generic placeholder NASA serves when a picture is unavailable', () => {
    expect(parseApod(rawApodPlaceholder())).toBeNull();
  });

  it.each([
    ['not an object', 'text'],
    ['null', null],
    ['no title', rawApod({ title: undefined })],
    ['an image without a URL', rawApod({ url: undefined })],
    ['a non-https image URL', rawApod({ url: 'javascript:alert(1)' })],
  ])('rejects %s', (_label, payload) => {
    expect(() => parseApod(payload)).toThrow(ParseError);
  });

  it('drops a full-size link that is not a web address', () => {
    expect(parseApod(rawApod({ hdurl: 'javascript:alert(1)' }))?.hdUrl).toBeUndefined();
  });
});
