import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '../AppProviders';
import { loadPickerLocale } from '../lib/pickerLocale';
import { createQueryClient } from '../lib/queryClient';
import { routes } from '../router';

/**
 * Renders the real route tree and providers at `path`, using an in-memory history.
 * Like `main.tsx`, it loads the date picker locale for `navigator.language` first.
 * Each call gets a fresh query cache, and retries happen without delay.
 * Returns the router so tests can assert on the current location.
 */
export async function renderApp(path = '/') {
  const pickerLocale = await loadPickerLocale(navigator.language);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = createQueryClient({ retryDelay: 0 });
  const user = userEvent.setup();

  render(
    <AppProviders pickerLocale={pickerLocale} queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  );

  return { router, user, queryClient };
}
