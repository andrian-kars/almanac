import { describe, expect, it } from 'vitest';
import { freezeTime } from '../test/clock';
import {
  addDays,
  type DateRange,
  formatLongDate,
  getAdjacentDays,
  getAllowedRange,
  getDisplayLocale,
  isInRange,
  type IsoDate,
  MIN_DATE,
  parseIsoDate,
  todayIso,
} from './date';

/** Test shorthand: a known-valid literal, checked at runtime so a typo fails loudly. */
function iso(value: string): IsoDate {
  const parsed = parseIsoDate(value);
  if (!parsed) throw new Error(`Invalid test date: ${value}`);
  return parsed;
}

describe('parseIsoDate', () => {
  it.each(['2024-05-01', '1940-01-01', '2024-02-29', '2026-12-31'])('accepts %s', (value) => {
    expect(parseIsoDate(value)).toBe(value);
  });

  it.each([
    ['empty string', ''],
    ['not a date', 'banana'],
    ['missing zero padding', '2024-5-1'],
    ['wrong separator', '2024/05/01'],
    ['trailing text', '2024-05-01x'],
    ['time part', '2024-05-01T00:00'],
    ['month 13', '2024-13-01'],
    ['month 0', '2024-00-10'],
    ['day 0', '2024-05-00'],
    ['31 April', '2024-04-31'],
    ['29 Feb in a non-leap year', '2023-02-29'],
    ['29 Feb in a century non-leap year', '1900-02-29'],
  ])('rejects %s (%s)', (_label, value) => {
    expect(parseIsoDate(value)).toBeNull();
  });
});

describe('todayIso', () => {
  it('returns the current local date as YYYY-MM-DD', () => {
    freezeTime(2026, 11, 10, 15, 30);

    expect(todayIso()).toBe('2026-11-10');
  });

  it('uses the local calendar day, not the UTC one', () => {
    // Local midnight: in any zone east of UTC this is still the previous day in UTC.
    freezeTime(2026, 1, 1, 0, 0);

    expect(todayIso()).toBe('2026-01-01');
  });

  it('pads single-digit months and days', () => {
    freezeTime(2026, 3, 7);

    expect(todayIso()).toBe('2026-03-07');
  });
});

describe('addDays', () => {
  it.each([
    ['2024-05-01', 1, '2024-05-02'],
    ['2024-05-01', -1, '2024-04-30'],
    ['2024-12-31', 1, '2025-01-01'],
    ['2025-01-01', -1, '2024-12-31'],
    ['2024-02-28', 1, '2024-02-29'],
    ['2023-02-28', 1, '2023-03-01'],
    ['2026-11-10', 14, '2026-11-24'],
    // Days on which clocks change in Europe and the US must still move by exactly one day.
    ['2026-03-28', 1, '2026-03-29'],
    ['2026-03-29', 1, '2026-03-30'],
    ['2026-11-01', 1, '2026-11-02'],
  ])('%s %+d days → %s', (start, days, expected) => {
    expect(addDays(iso(start), days)).toBe(expected);
  });
});

describe('getAllowedRange', () => {
  it('runs from the start of the weather archive to two weeks after today', () => {
    expect(getAllowedRange(iso('2026-11-10'))).toEqual({ min: '1940-01-01', max: '2026-11-24' });
  });

  it('defaults to the real today', () => {
    freezeTime(2026, 11, 10);

    expect(getAllowedRange()).toEqual({ min: MIN_DATE, max: '2026-11-24' });
  });
});

describe('isInRange', () => {
  const range: DateRange = { min: iso('1940-01-01'), max: iso('2026-11-24') };

  it.each(['1940-01-01', '2000-06-15', '2026-11-24'])('includes %s', (value) => {
    expect(isInRange(iso(value), range)).toBe(true);
  });

  it.each(['1939-12-31', '2026-11-25'])('excludes %s', (value) => {
    expect(isInRange(iso(value), range)).toBe(false);
  });
});

describe('getAdjacentDays', () => {
  const range: DateRange = { min: iso('1940-01-01'), max: iso('2026-11-24') };

  it('returns the previous and next day inside the range', () => {
    expect(getAdjacentDays(iso('2024-05-01'), range)).toEqual({
      previous: '2024-04-30',
      next: '2024-05-02',
    });
  });

  it('has no previous day on the first allowed date', () => {
    expect(getAdjacentDays(iso('1940-01-01'), range).previous).toBeNull();
  });

  it('has no next day on the last allowed date', () => {
    expect(getAdjacentDays(iso('2026-11-24'), range).next).toBeNull();
  });
});

describe('getDisplayLocale', () => {
  it('returns the browser language when Intl supports it', () => {
    // The test setup pins navigator.language to en-US.
    expect(getDisplayLocale()).toBe('en-US');
    expect(getDisplayLocale('es-ES')).toBe('es-ES');
  });

  it('falls back to en-US for a malformed language tag instead of throwing', () => {
    expect(getDisplayLocale('not a locale!')).toBe('en-US');
  });
});

describe('formatLongDate', () => {
  it('uses the browser language by default', () => {
    // The test setup pins navigator.language to en-US.
    expect(formatLongDate(iso('2024-05-01'))).toBe('May 1, 2024');
  });

  it.each([
    ['en-GB', '1 May 2024'],
    ['es', '1 de mayo de 2024'],
    ['de', '1. Mai 2024'],
  ])('formats for %s', (locale, expected) => {
    expect(formatLongDate(iso('2024-05-01'), locale)).toBe(expected);
  });

  it('never shifts the day, whatever the time zone', () => {
    // Formatting a local-midnight Date in UTC (or vice versa) is the classic off-by-one bug.
    expect(formatLongDate(iso('2024-01-01'))).toBe('January 1, 2024');
    expect(formatLongDate(iso('2024-12-31'))).toBe('December 31, 2024');
  });
});
