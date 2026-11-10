import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  // Vitest globals are off, so React Testing Library cannot register its own cleanup.
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
