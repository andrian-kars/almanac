import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { COLOR_SCHEME_ATTRIBUTE } from '../lib/colorMode';

beforeEach(() => {
  // Pin the browser language so locale-aware formatting gives the same result on every
  // machine (Node's own default follows the OS, e.g. uk-UA).
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
  // Tests never see the developer's real NASA key from .env.
  vi.stubEnv('VITE_NASA_API_KEY', 'TEST_KEY');
  // No test may reach the real network. Requests stay pending unless a test mocks them
  // with mockFetch().
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(() => new Promise<Response>(() => {})),
  );
  // jsdom does not scroll (it logs "not implemented"); tests can still check the calls.
  vi.stubGlobal('scrollTo', vi.fn());
});

afterEach(() => {
  // Vitest globals are off, so React Testing Library cannot register its own cleanup.
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
  // The color scheme is set on the page itself, which outlives a test's rendered app.
  document.documentElement.removeAttribute(COLOR_SCHEME_ATTRIBUTE);
});
