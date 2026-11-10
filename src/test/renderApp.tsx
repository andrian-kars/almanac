import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '../AppProviders';
import { loadPickerLocale } from '../lib/pickerLocale';
import { routes } from '../router';

/**
 * Renders the real route tree and providers at `path`, using an in-memory history.
 * Like `main.tsx`, it loads the date picker locale for `navigator.language` first.
 * Returns the router so tests can assert on the current location.
 */
export async function renderApp(path = '/') {
  const pickerLocale = await loadPickerLocale(navigator.language);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();

  render(
    <AppProviders pickerLocale={pickerLocale}>
      <RouterProvider router={router} />
    </AppProviders>,
  );

  return { router, user };
}
