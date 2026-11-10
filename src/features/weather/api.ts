import { addDays, type IsoDate } from '../../lib/date';
import { fetchJson, ParseError } from '../../lib/http';
import type { Location } from './locations';
import type { UnitSystem } from './units';

/**
 * Open-Meteo daily weather for one place and date: historical reanalysis back to 1940, and
 * forecasts up to 16 days ahead. https://open-meteo.com/en/docs
 */

export type DailyWeather = {
  /** WMO weather interpretation code. */
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  precipitation: number | null;
  windSpeedMax: number | null;
  /** Local time at the location, "YYYY-MM-DDTHH:mm" with no offset. */
  sunrise: string | null;
  sunset: string | null;
  daylightSeconds: number | null;
};

const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * The archive lags a few days behind real time; the forecast endpoint also serves the last
 * ~3 months. Switching at 30 days keeps clear of both limits.
 */
const ARCHIVE_AFTER_DAYS = 30;

const DAILY_VARIABLES = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'wind_speed_10m_max',
  'sunrise',
  'sunset',
  'daylight_duration',
];

type WeatherRequest = {
  date: IsoDate;
  today: IsoDate;
  location: Location;
  units: UnitSystem;
};

export function buildWeatherUrl({ date, today, location, units }: WeatherRequest): string {
  const useArchive = date < addDays(today, -ARCHIVE_AFTER_DAYS);
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    start_date: date,
    end_date: date,
    daily: DAILY_VARIABLES.join(','),
    // Sunrise and sunset in the location's own time, not the viewer's.
    timezone: 'auto',
  });
  if (units === 'imperial') {
    params.set('temperature_unit', 'fahrenheit');
    params.set('precipitation_unit', 'inch');
    params.set('wind_speed_unit', 'mph');
  }
  return `${useArchive ? ARCHIVE_URL : FORECAST_URL}?${params.toString()}`;
}

export async function fetchWeather(
  request: WeatherRequest,
  signal?: AbortSignal,
): Promise<DailyWeather | null> {
  return parseWeather(await fetchJson(buildWeatherUrl(request), { signal }));
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The first (only) value of a daily series, or null if missing or of the wrong type. */
function first<T>(daily: Record<string, unknown>, name: string, isType: (v: unknown) => v is T) {
  const series = daily[name];
  const value: unknown = Array.isArray(series) ? series[0] : undefined;
  return isType(value) ? value : null;
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isString = (value: unknown): value is string => typeof value === 'string';

/**
 * Reads the single requested day. Returns null when the source has no core values for it
 * (conditions and temperatures); secondary values may be missing individually.
 */
export function parseWeather(payload: unknown): DailyWeather | null {
  if (!isRecord(payload) || !isRecord(payload.daily)) {
    throw new ParseError('Weather response has no daily data');
  }
  const { daily } = payload;

  const weatherCode = first(daily, 'weather_code', isNumber);
  const temperatureMax = first(daily, 'temperature_2m_max', isNumber);
  const temperatureMin = first(daily, 'temperature_2m_min', isNumber);
  if (weatherCode === null || temperatureMax === null || temperatureMin === null) return null;

  return {
    weatherCode,
    temperatureMax,
    temperatureMin,
    precipitation: first(daily, 'precipitation_sum', isNumber),
    windSpeedMax: first(daily, 'wind_speed_10m_max', isNumber),
    sunrise: first(daily, 'sunrise', isString),
    sunset: first(daily, 'sunset', isString),
    daylightSeconds: first(daily, 'daylight_duration', isNumber),
  };
}

/** Minutes after local midnight for a "YYYY-MM-DDTHH:mm" time, or null if malformed. */
export function minutesOfDay(localTime: string): number | null {
  const match = /T(\d{2}):(\d{2})/.exec(localTime);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/**
 * A wall-clock time at the location, in the viewer's format ("6:09 AM", "06:09"). The API
 * gives local time without an offset, so it is formatted in UTC to avoid any shift.
 */
export function formatClockTime(localTime: string, locale: string): string {
  const minutes = minutesOfDay(localTime) ?? 0;
  const asUtc = new Date(Date.UTC(2000, 0, 1, Math.floor(minutes / 60), minutes % 60));
  return (
    new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone: 'UTC' })
      .format(asUtc)
      // Browsers put a narrow no-break space before AM/PM; plain spaces read the same.
      .replace(/\s/g, ' ')
  );
}

/** "14 h 58 min". */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  return `${Math.floor(totalMinutes / 60)} h ${totalMinutes % 60} min`;
}
