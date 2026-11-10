import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

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
});

afterEach(() => {
  // Vitest globals are off, so React Testing Library cannot register its own cleanup.
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
});
