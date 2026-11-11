import { describe, expect, it, vi } from 'vitest';
import { type IsoDate, parseIsoDate } from '../../lib/date';
import { NetworkError, ParseError } from '../../lib/http';
import { mockFetch, requestedUrls } from '../../test/mockFetch';
import {
  apodPageUrl,
  buildApodUrl,
  fetchApod,
  getApodApiKey,
  getApodAvailability,
  parseApod,
} from './api';
import { rawApod, rawApodPlaceholder, rawApodVideo, rawNasaSciencePost } from './fixtures';

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
      // The API gives no page address; the card builds one from the date.
      pageUrl: undefined,
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

describe('fetchApod', () => {
  const NASA_API = 'api.nasa.gov';
  const NASA_SCIENCE = 'science.nasa.gov/wp-json';
  const may1 = iso('2024-05-01');
  const sources = (fetchMock: ReturnType<typeof mockFetch>) =>
    requestedUrls(fetchMock).map((url) => new URL(url).hostname);

  it('uses the APOD API when it has the picture', async () => {
    const fetchMock = mockFetch({
      [NASA_API]: { json: rawApod() },
      [NASA_SCIENCE]: { json: [rawNasaSciencePost()] },
    });

    expect((await fetchApod(may1))?.url).toBe(
      'https://apod.nasa.gov/apod/image/2405/MarsHole_1080.jpg',
    );
    expect(sources(fetchMock)).toEqual(['api.nasa.gov']);
  });

  it('looks the date up on science.nasa.gov when the API answers with its placeholder', async () => {
    const fetchMock = mockFetch({
      [NASA_API]: { json: rawApodPlaceholder() },
      [NASA_SCIENCE]: { json: [rawNasaSciencePost()] },
    });

    expect(await fetchApod(may1)).toMatchObject({
      title: 'A Hole in Mars',
      pageUrl: 'https://science.nasa.gov/image-article/apod-2024-may-01-a-hole-in-mars/',
    });
    expect(sources(fetchMock)).toEqual(['api.nasa.gov', 'science.nasa.gov']);
  });

  it('returns null when neither source has the picture', async () => {
    mockFetch({ [NASA_API]: { json: rawApodPlaceholder() }, [NASA_SCIENCE]: { json: [] } });

    expect(await fetchApod(may1)).toBeNull();
  });

  it.each([429, 503])('falls back when the API fails with %i', async (status) => {
    mockFetch({ [NASA_API]: { status }, [NASA_SCIENCE]: { json: [rawNasaSciencePost()] } });

    expect((await fetchApod(may1))?.title).toBe('A Hole in Mars');
  });

  it('reports the API’s error when the fallback has nothing either', async () => {
    mockFetch({ [NASA_API]: { status: 429 }, [NASA_SCIENCE]: { json: [] } });

    await expect(fetchApod(may1)).rejects.toMatchObject({ status: 429 });
  });

  it('reports the API’s error when the fallback fails too', async () => {
    mockFetch({ [NASA_API]: { status: 429 }, [NASA_SCIENCE]: { status: 500 } });

    await expect(fetchApod(may1)).rejects.toMatchObject({ status: 429 });
  });

  it('reports the fallback’s error after a placeholder', async () => {
    mockFetch({ [NASA_API]: { json: rawApodPlaceholder() }, [NASA_SCIENCE]: { status: 500 } });

    await expect(fetchApod(may1)).rejects.toMatchObject({ status: 500 });
  });

  it('does not fall back when the network is down', async () => {
    const fetchMock = mockFetch({
      [NASA_API]: { error: new TypeError('Failed to fetch') },
      [NASA_SCIENCE]: { json: [rawNasaSciencePost()] },
    });

    await expect(fetchApod(may1)).rejects.toBeInstanceOf(NetworkError);
    expect(sources(fetchMock)).toEqual(['api.nasa.gov']);
  });
});
