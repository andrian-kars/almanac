import { formatLanguage } from './regionalFormat';

/**
 * Calendar-date helpers. A date is a plain `YYYY-MM-DD` string: no time, no time zone.
 * That is what the URL and every API use, and it sorts correctly as text.
 *
 * Arithmetic runs on UTC midnight, which has no daylight-saving jumps, so adding a day
 * always moves exactly one calendar day.
 */

/**
 * A `YYYY-MM-DD` string known to be a real calendar date. Only `parseIsoDate` and the
 * helpers below produce one, so an unchecked string from the URL can't be passed by mistake.
 */
export type IsoDate = string & { readonly __brand: 'IsoDate' };

export type DateRange = { min: IsoDate; max: IsoDate };

/** First day in the Open-Meteo historical archive. */
export const MIN_DATE = '1940-01-01' as IsoDate;

/** How far ahead the Open-Meteo forecast reaches (it allows 15; one day of margin). */
export const FORECAST_DAYS = 14;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

function fromParts(year: number, month: number, day: number): IsoDate {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}` as IsoDate;
}

function toUtcDate(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fromUtcDate(date: Date): IsoDate {
  return fromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Returns the date if `value` is a real calendar date in strict `YYYY-MM-DD` form, else null. */
export function parseIsoDate(value: string): IsoDate | null {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;

  const [, year, month, day] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC rolls over invalid parts (April 31 → May 1), so a round trip catches them.
  const isRealDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;

  return isRealDate ? (value as IsoDate) : null;
}

/** Today's date in the user's local time zone. */
export function todayIso(): IsoDate {
  const now = new Date();
  return fromParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * Today's date in a given IANA time zone, e.g. "America/New_York". For sources that publish
 * on their own clock rather than the user's.
 */
export function todayInTimeZone(timeZone: string): IsoDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);

  return fromParts(part('year'), part('month'), part('day'));
}

/** Moves `date` by a whole number of calendar days (negative goes back). */
export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcDate(new Date(toUtcDate(date).getTime() + days * MS_PER_DAY));
}

/** The dates the app can show: the weather archive's start up to the forecast horizon. */
export function getAllowedRange(today: IsoDate = todayIso()): DateRange {
  return { min: MIN_DATE, max: addDays(today, FORECAST_DAYS) };
}

export function isInRange(date: IsoDate, { min, max }: DateRange): boolean {
  // Same-length YYYY-MM-DD strings compare in calendar order.
  return date >= min && date <= max;
}

/** The days either side of `date`, or null where that would leave the range. */
export function getAdjacentDays(
  date: IsoDate,
  range: DateRange,
): { previous: IsoDate | null; next: IsoDate | null } {
  const previous = addDays(date, -1);
  const next = addDays(date, 1);
  return {
    previous: isInRange(previous, range) ? previous : null,
    next: isInRange(next, range) ? next : null,
  };
}

/** The calendar year of a date, as a number. */
export function getYear(date: IsoDate): number {
  return Number(date.slice(0, 4));
}

/** Position of a date within its year: 1 May 2024 is day 122 of 366, with 244 to go. */
export function getDayOfYear(date: IsoDate): { day: number; total: number; remaining: number } {
  const year = getYear(date);
  const startOfYear = Date.UTC(year, 0, 1);
  const day = Math.round((toUtcDate(date).getTime() - startOfYear) / MS_PER_DAY) + 1;
  const total = Math.round((Date.UTC(year + 1, 0, 1) - startOfYear) / MS_PER_DAY);
  return { day, total, remaining: total - day };
}

/**
 * The pieces of a date as a tear-off calendar shows them, in the user's language:
 * "Wednesday", "1", "May 2024".
 */
export function getDateParts(
  date: IsoDate,
  locale: string = getDisplayLocale(),
): { weekday: string; day: string; monthYear: string } {
  const utc = toUtcDate(date);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(utc);

  return {
    weekday: format({ weekday: 'long' }),
    day: format({ day: 'numeric' }),
    monthYear: format({ month: 'long', year: 'numeric' }),
  };
}

/** Month and day as two-digit strings, for "on this day" style APIs. */
export function getMonthDay(date: IsoDate): { month: string; day: string } {
  return { month: date.slice(5, 7), day: date.slice(8, 10) };
}

/**
 * The locale dates are actually formatted in: the language chosen for formats (the browser's
 * own, unless the units and date format switch says otherwise; see regionalFormat.ts) if
 * Intl supports it, otherwise whatever Intl falls back to. Also used for the `lang`
 * attribute of formatted dates, so screen readers pronounce them in the right language.
 *
 * Components should use `useDisplayLocale`, which also re-renders them when the choice
 * changes.
 */
export function getDisplayLocale(language: string = formatLanguage()): string {
  try {
    return new Intl.DateTimeFormat(language).resolvedOptions().locale;
  } catch {
    // Malformed tags make Intl throw a RangeError; never let that break a page.
    return 'en-US';
  }
}

/**
 * Formats a date for display in the user's language, e.g. "May 1, 2024" (en-US),
 * "1 May 2024" (en-GB) or "1 de mayo de 2024" (es).
 */
export function formatLongDate(date: IsoDate, locale: string = getDisplayLocale()): string {
  // The Date is UTC midnight, so format it in UTC too or the day can shift.
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
    toUtcDate(date),
  );
}
