import { rawApod } from '../features/apod/fixtures';
import { rawFeed } from '../features/onThisDay/fixtures';
import { rawWeather } from '../features/weather/fixtures';
import { rawSummary } from '../features/wikiSummary/fixtures';
import { mockFetch, type MockReply } from './mockFetch';

/** URL fragments that tell the app's data sources apart. */
export const SOURCES = {
  weather: 'open-meteo.com/v1',
  apod: 'api.nasa.gov',
  nasaScience: 'science.nasa.gov/wp-json',
  onThisDay: 'feed/onthisday',
  summary: 'page/summary',
} as const;

type Source = keyof typeof SOURCES;

/**
 * Answers every source the day page uses with test data for 1 May 2024. Pass a reply for a
 * source to change what it answers, e.g. `{ weather: { status: 500 } }`.
 */
export function mockAllSources(replies: Partial<Record<Source, MockReply>> = {}) {
  const defaults: Record<Source, MockReply> = {
    weather: {
      json: rawWeather({
        time: ['2024-05-01'],
        sunrise: ['2024-05-01T07:24'],
        sunset: ['2024-05-01T21:38'],
      }),
    },
    apod: { json: rawApod() },
    nasaScience: { json: [] },
    onThisDay: { json: rawFeed() },
    summary: { json: rawSummary('Empire State Building') },
  };

  return mockFetch(
    Object.fromEntries(
      (Object.keys(SOURCES) as Source[]).map((source) => [
        SOURCES[source],
        replies[source] ?? defaults[source],
      ]),
    ),
  );
}
