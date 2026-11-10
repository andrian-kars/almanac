import { describe, expect, it } from 'vitest';
import { freezeTime } from '../test/clock';
import { formatLongDate, todayIso } from './date';

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
});

describe('formatLongDate', () => {
  it('formats a YYYY-MM-DD date for display', () => {
    expect(formatLongDate('2024-05-01')).toBe('May 1, 2024');
  });
});
