import { vi } from 'vitest';

/**
 * Freezes "now" at the given local date and time. Only `Date` is faked, so
 * user-event and Testing Library's own timers keep running normally.
 * Real timers are restored after every test in `setup.ts`.
 */
/** Freezes "now" at an exact instant, e.g. "2026-11-11T03:00:00Z", whatever the time zone. */
export function freezeInstant(isoInstant: string): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(isoInstant));
}

export function freezeTime(year: number, month: number, day: number, hour = 12, minute = 0): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  // `month` is 1-based here, unlike the Date constructor.
  vi.setSystemTime(new Date(year, month - 1, day, hour, minute));
}
