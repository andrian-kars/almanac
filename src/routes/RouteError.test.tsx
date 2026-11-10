import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../AppProviders';
import { AppLayout } from '../components/AppLayout';
import { freezeTime } from '../test/clock';
import { RouteError } from './RouteError';

function Crash(): never {
  throw new Error('Kaboom');
}

/** Same shape as the real route tree, with one page that always throws. */
function renderCrashingPage() {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          {
            errorElement: <RouteError />,
            children: [
              { path: 'crash', element: <Crash /> },
              { path: 'day/:date', element: <h1>Day page</h1> },
            ],
          },
        ],
      },
    ],
    { initialEntries: ['/crash'] },
  );

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );

  return { router, user: userEvent.setup() };
}

beforeEach(() => {
  freezeTime(2026, 11, 10);
  // React and React Router log caught render errors; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('RouteError', () => {
  it('shows a friendly message inside the app shell instead of crashing the app', async () => {
    renderCrashingPage();

    const main = screen.getByRole('main');
    expect(
      await within(main).findByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeVisible();
    // The top bar survives, so the user can still navigate away.
    expect(
      within(screen.getByRole('banner')).getByRole('link', { name: 'Bookmarks' }),
    ).toBeVisible();
    // Internal error details are not shown to the user.
    expect(screen.queryByText(/Kaboom/)).not.toBeInTheDocument();
  });

  it('sets the document title', async () => {
    renderCrashingPage();

    await waitFor(() => expect(document.title).toBe('Something went wrong · Almanac'));
  });

  it('offers a way back to today', async () => {
    const { router, user } = renderCrashingPage();

    await user.click(await screen.findByRole('link', { name: 'Back to today' }));

    expect(router.state.location.pathname).toBe('/day/2026-11-10');
  });
});
