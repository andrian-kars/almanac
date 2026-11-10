import { vi } from 'vitest';

/**
 * Freezes "now" at the given local date and time. Only `Date` is faked, so
 * user-event and Testing Library's own timers keep running normally.
 * Real timers are restored after every test in `setup.ts`.
 */
export function freezeTime(year: number, month: number, day: number, hour = 12, minute = 0): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  // `month` is 1-based here, unlike the Date constructor.
  vi.setSystemTime(new Date(year, month - 1, day, hour, minute));
}
