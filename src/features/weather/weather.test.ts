import { describe, expect, it } from 'vitest';
import { type IsoDate, parseIsoDate } from '../../lib/date';
import { ParseError } from '../../lib/http';
import { buildWeatherUrl, formatClockTime, formatDuration, parseWeather } from './api';
import { rawWeather } from './fixtures';
import { DEFAULT_LOCATION, PRESET_LOCATIONS } from './locations';
import { defaultUnitSystem } from '../../lib/regionalFormat';
import { describeWeatherCode } from './weatherCodes';

function iso(value: string): IsoDate {
  const parsed = parseIsoDate(value);
  if (!parsed) throw new Error(`Invalid test date: ${value}`);
  return parsed;
}

const TODAY = iso('2026-11-10');

describe('locations', () => {
  it('defaults to Fene', () => {
    expect(DEFAULT_LOCATION).toMatchObject({ name: 'Fene', country: 'Spain' });
  });

  it('offers Fene, Zolochiv (Lviv Oblast) and Cody', () => {
    expect(PRESET_LOCATIONS.map(({ name, region }) => `${name}, ${region}`)).toEqual([
      'Fene, Galicia',
      'Zolochiv, Lviv Oblast',
      'Cody, Wyoming',
    ]);
  });
});

describe('buildWeatherUrl', () => {
  const request = (date: string, units: 'metric' | 'imperial' = 'metric') =>
    new URL(buildWeatherUrl({ date: iso(date), today: TODAY, location: DEFAULT_LOCATION, units }));

  it('uses the historical archive for dates more than 30 days ago', () => {
    const url = request('1969-07-20');

    expect(url.origin + url.pathname).toBe('https://archive-api.open-meteo.com/v1/archive');
  });

  it.each(['2026-10-11', '2026-11-09', '2026-11-10', '2026-11-24'])(
    'uses the forecast endpoint for %s, which the archive may not have yet',
    (date) => {
      const url = request(date);

      expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    },
  );

  it('asks for exactly one day at the location, in its local time zone', () => {
    const { searchParams } = request('1969-07-20');

    expect(searchParams.get('latitude')).toBe('43.45');
    expect(searchParams.get('longitude')).toBe('-8.15');
    expect(searchParams.get('start_date')).toBe('1969-07-20');
    expect(searchParams.get('end_date')).toBe('1969-07-20');
    expect(searchParams.get('timezone')).toBe('auto');
    expect(searchParams.get('daily')?.split(',')).toEqual([
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'wind_speed_10m_max',
      'sunrise',
      'sunset',
      'daylight_duration',
    ]);
  });

  it('uses the API defaults for metric units', () => {
    const { searchParams } = request('1969-07-20');

    expect(searchParams.has('temperature_unit')).toBe(false);
    expect(searchParams.has('precipitation_unit')).toBe(false);
    expect(searchParams.has('wind_speed_unit')).toBe(false);
  });

  it('asks the API for imperial units rather than converting', () => {
    const { searchParams } = request('1969-07-20', 'imperial');

    expect(searchParams.get('temperature_unit')).toBe('fahrenheit');
    expect(searchParams.get('precipitation_unit')).toBe('inch');
    expect(searchParams.get('wind_speed_unit')).toBe('mph');
  });
});

describe('parseWeather', () => {
  it('reads the one requested day', () => {
    expect(parseWeather(rawWeather())).toEqual({
      weatherCode: 2,
      temperatureMax: 23.7,
      temperatureMin: 16,
      precipitation: 0,
      windSpeedMax: 25.1,
      sunrise: '1969-07-20T06:09',
      sunset: '1969-07-20T21:07',
      daylightSeconds: 53890.23,
    });
  });

  it('returns null when the source has no values for the day', () => {
    expect(parseWeather(rawWeather({ weather_code: [null], temperature_2m_max: [null] }))).toBe(
      null,
    );
  });

  it('keeps the day when only a secondary value is missing', () => {
    const weather = parseWeather(rawWeather({ wind_speed_10m_max: [null], sunrise: [null] }));

    expect(weather).toMatchObject({ temperatureMax: 23.7, windSpeedMax: null, sunrise: null });
  });

  it.each([null, 'text', [], { daily: 'nope' }, {}])(
    'rejects a payload without daily data: %o',
    (payload) => {
      expect(() => parseWeather(payload)).toThrow(ParseError);
    },
  );
});

describe('describeWeatherCode', () => {
  it.each([
    [0, 'Clear sky'],
    [2, 'Partly cloudy'],
    [3, 'Overcast'],
    [45, 'Fog'],
    [53, 'Drizzle'],
    [63, 'Rain'],
    [65, 'Heavy rain'],
    [73, 'Snow'],
    [81, 'Rain showers'],
    [95, 'Thunderstorm'],
    [99, 'Thunderstorm with hail'],
  ])('code %d → %s', (code, label) => {
    expect(describeWeatherCode(code).label).toBe(label);
  });

  it('has a neutral label for codes it does not know', () => {
    expect(describeWeatherCode(42).label).toBe('Unknown conditions');
  });
});

describe('formatClockTime', () => {
  it('formats the local time the API gives, without shifting it', () => {
    expect(formatClockTime('1969-07-20T06:09', 'en-US')).toBe('6:09 AM');
    expect(formatClockTime('1969-07-20T21:07', 'en-GB')).toBe('21:07');
  });
});

describe('formatDuration', () => {
  it.each([
    [53890.23, '14 h 58 min'],
    [33846.45, '9 h 24 min'],
    [3600, '1 h 0 min'],
    [0, '0 h 0 min'],
  ])('%d seconds → %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe('defaultUnitSystem', () => {
  it.each([
    ['en-US', 'imperial'],
    ['en', 'imperial'],
    ['es-US', 'imperial'],
    ['en-GB', 'metric'],
    ['es-ES', 'metric'],
    ['uk-UA', 'metric'],
    ['de', 'metric'],
    ['not a locale!', 'metric'],
  ])('%s → %s', (language, expected) => {
    expect(defaultUnitSystem(language)).toBe(expected);
  });
});
