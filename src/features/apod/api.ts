import type { IsoDate } from '../../lib/date';
import { fetchJson, HttpError, ParseError } from '../../lib/http';
import { fetchNasaScienceApod } from './nasaScience';

/**
 * NASA Astronomy Picture of the Day, from the APOD API (https://api.nasa.gov), with NASA's
 * new APOD site as a fallback (see nasaScience.ts).
 */

export type Apod = {
  title: string;
  explanation: string;
  mediaType: 'image' | 'video' | 'other';
  /** The image, or the video's address. Always set for images. */
  url: string | undefined;
  /** Full-resolution image, when there is one. */
  hdUrl: string | undefined;
  /** Still frame for a video, when NASA provides one. */
  thumbnailUrl: string | undefined;
  copyright: string | undefined;
  /** The picture's own page, when the source gives one; otherwise see apodPageUrl. */
  pageUrl: string | undefined;
};

export type ApodAvailability = 'available' | 'before-archive' | 'not-yet';

const APOD_URL = 'https://api.nasa.gov/planetary/apod';
const DEMO_KEY = 'DEMO_KEY';

/** The first Astronomy Picture of the Day. */
export const APOD_FIRST_DATE = '1995-06-16' as IsoDate;

/** APOD is published on US Eastern time, so that zone decides what "today" is for it. */
export const APOD_TIME_ZONE = 'America/New_York';

/**
 * The key from `VITE_NASA_API_KEY`, or NASA's shared, heavily rate-limited demo key.
 * Vite inlines the value at build time, so it is public in the shipped bundle either way.
 */
export function getApodApiKey(): string {
  return import.meta.env.VITE_NASA_API_KEY?.trim() || DEMO_KEY;
}

export const isDemoKey = (apiKey: string) => apiKey === DEMO_KEY;

export function buildApodUrl(date: IsoDate, apiKey: string): string {
  // `thumbs` adds a still frame for video entries.
  const params = new URLSearchParams({ date, thumbs: 'true', api_key: apiKey });
  return `${APOD_URL}?${params.toString()}`;
}

/** Whether NASA can have a picture for `date`, given today's date in APOD's time zone. */
export function getApodAvailability(date: IsoDate, apodToday: IsoDate): ApodAvailability {
  if (date < APOD_FIRST_DATE) return 'before-archive';
  if (date > apodToday) return 'not-yet';
  return 'available';
}

/** The human-readable APOD page for a date, e.g. .../ap240501.html. */
export function apodPageUrl(date: IsoDate): string {
  const [year = '', month = '', day = ''] = date.split('-');
  return `https://apod.nasa.gov/apod/ap${year.slice(2)}${month}${day}.html`;
}

/**
 * The picture for `date`, or null when NASA has none. The APOD API is asked first. When it
 * has no picture (its placeholder) or refuses (rate limit, outage), NASA's APOD site is asked
 * instead. If the site has nothing either, the API's error is the one reported, so the
 * demo-key message still appears. A network failure or a malformed answer is not retried
 * elsewhere: the second source would almost certainly fail the same way.
 */
export async function fetchApod(date: IsoDate, signal?: AbortSignal): Promise<Apod | null> {
  let apiError: HttpError | undefined;
  try {
    const apod = parseApod(await fetchJson(buildApodUrl(date, getApodApiKey()), { signal }));
    if (apod) return apod;
  } catch (error) {
    if (!(error instanceof HttpError)) throw error;
    apiError = error;
  }

  let fallback: Apod | null;
  try {
    fallback = await fetchNasaScienceApod(date, signal);
  } catch (error) {
    throw apiError ?? error;
  }
  if (fallback || !apiError) return fallback;
  throw apiError;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/** Only real web addresses become links or image sources; anything else is dropped. */
const asWebUrl = (value: unknown): string | undefined => {
  const text = asText(value);
  return text && /^https?:\/\//i.test(text) ? text : undefined;
};

/**
 * When a picture is unavailable, NASA answers 200 with a generic "NASA Science" entry whose
 * image is the NASA logo, instead of an error. It is detected so it is not shown as the
 * day's picture.
 */
function isPlaceholder(raw: Record<string, unknown>): boolean {
  const url = asText(raw.url) ?? '';
  const explanation = asText(raw.explanation) ?? '';
  return /nasa-logo/i.test(url) || explanation.startsWith('Discover the cosmos!');
}

/** Validates and maps a response. Returns null for NASA's "unavailable" placeholder. */
export function parseApod(payload: unknown): Apod | null {
  if (!isRecord(payload)) throw new ParseError('APOD response is not an object');
  if (isPlaceholder(payload)) return null;

  const title = asText(payload.title);
  if (!title) throw new ParseError('APOD response has no title');

  const url = asWebUrl(payload.url);
  let mediaType: Apod['mediaType'] = 'other';
  if (payload.media_type === 'image') {
    if (!url) throw new ParseError('APOD image has no usable URL');
    mediaType = 'image';
  } else if (payload.media_type === 'video' && url) {
    mediaType = 'video';
  }

  return {
    title,
    explanation: asText(payload.explanation) ?? '',
    mediaType,
    url,
    hdUrl: asWebUrl(payload.hdurl),
    thumbnailUrl: asWebUrl(payload.thumbnail_url),
    // Credits arrive with stray line breaks.
    copyright: asText(payload.copyright)?.replace(/\s+/g, ' '),
    pageUrl: undefined,
  };
}
