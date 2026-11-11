import { describe, expect, it } from 'vitest';
import nginxConfig from '../nginx/default.conf?raw';
import securityHeaders from '../nginx/security-headers.conf?raw';
import { buildApodUrl } from './features/apod/api';
import { buildNasaScienceUrl } from './features/apod/nasaScience';
import { buildWeatherUrl } from './features/weather/api';
import { buildGeocodingUrl } from './features/weather/geocoding';
import { DEFAULT_LOCATION } from './features/weather/locations';
import { buildSummaryUrl } from './features/wikiSummary/api';
import type { IsoDate } from './lib/date';
import { WIKIPEDIA_REST_URL } from './lib/wikipedia';

/**
 * The container's nginx sends a Content-Security-Policy: the browser may only run the app's
 * own scripts and only talk to the APIs listed. These tests read the policy from the nginx
 * config and check it against the addresses the app really requests, so a new API cannot be
 * added without the policy (it would work in development and fail in the container).
 */

const policy = /Content-Security-Policy\s+"([^"]+)"/.exec(securityHeaders)?.[1] ?? '';

/** The sources a policy directive allows, e.g. `connect-src`. */
function sources(directive: string): string[] {
  const entry = policy
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .find(([name]) => name === directive);
  return entry?.slice(1) ?? [];
}

const DATE = '2024-05-01' as IsoDate;
const TODAY = '2026-11-10' as IsoDate;

/** One address per API the app calls, built the way the app builds them. */
const apiRequests = {
  'On This Day': `${WIKIPEDIA_REST_URL}/feed/onthisday/all/05/01`,
  'page summary': buildSummaryUrl('Ayrton_Senna'),
  'weather archive': buildWeatherUrl({
    date: DATE,
    today: TODAY,
    location: DEFAULT_LOCATION,
    units: 'metric',
  }),
  'weather forecast': buildWeatherUrl({
    date: TODAY,
    today: TODAY,
    location: DEFAULT_LOCATION,
    units: 'metric',
  }),
  'place search': buildGeocodingUrl('Paris'),
  'NASA APOD API': buildApodUrl(DATE, 'KEY'),
  'NASA APOD site': buildNasaScienceUrl(DATE),
};

describe('the Content-Security-Policy', () => {
  it('is sent on every response, error pages included', () => {
    expect(policy).not.toBe('');
    expect(securityHeaders).toMatch(/Content-Security-Policy\s+"[^"]+"\s+always;/);
  });

  it('runs only the app’s own scripts: nothing inline, nothing from elsewhere', () => {
    expect(sources('script-src')).toEqual(["'self'"]);
  });

  it.each(Object.entries(apiRequests))('allows the %s request', (_name, url) => {
    expect(sources('connect-src')).toContain(new URL(url).origin);
  });

  it('allows nothing else to be fetched', () => {
    const origins = new Set(Object.values(apiRequests).map((url) => new URL(url).origin));

    expect(sources('connect-src')).toEqual(["'self'", ...origins]);
  });

  it('shows pictures from any secure address, as the APIs link them from many hosts', () => {
    expect(sources('img-src')).toEqual(expect.arrayContaining(["'self'", 'https:']));
  });

  it('cannot be framed by other sites or embed plugins', () => {
    expect(sources('frame-ancestors')).toEqual(["'none'"]);
    expect(sources('object-src')).toEqual(["'none'"]);
  });
});

describe('the nginx config', () => {
  it('adds the security headers in every location', () => {
    // nginx drops inherited add_header lines in any block that adds its own (Cache-Control),
    // so each location has to include them itself.
    const locations = nginxConfig.match(/location\s+[^{]+\{[^}]*\}/g) ?? [];

    expect(locations.length).toBeGreaterThan(0);
    for (const location of locations) {
      expect(location).toContain('include /etc/nginx/snippets/security-headers.conf;');
    }
  });
});
