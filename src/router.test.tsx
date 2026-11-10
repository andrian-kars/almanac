import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { freezeTime } from './test/clock';
import { renderApp } from './test/renderApp';

const findPageHeading = (name: string) => screen.findByRole('heading', { level: 1, name });

beforeEach(() => {
  freezeTime(2026, 11, 10);
});

describe('routing', () => {
  it('redirects / to the briefing for today', async () => {
    const { router } = renderApp('/');

    expect(await findPageHeading('November 10, 2026')).toBeVisible();
    expect(router.state.location.pathname).toBe('/day/2026-11-10');
  });

  it('shows the briefing for the date in the URL', async () => {
    renderApp('/day/2024-05-01');

    expect(await findPageHeading('May 1, 2024')).toBeVisible();
  });

  it('shows the bookmarks page at /bookmarks', async () => {
    renderApp('/bookmarks');

    expect(await findPageHeading('Bookmarks')).toBeVisible();
  });

  it.each([
    ['not a date', 'banana'],
    ['an impossible date', '2024-02-30'],
    ['a date before the weather archive starts', '1939-12-31'],
    ['a date past the forecast horizon', '2026-11-25'],
  ])('redirects %s to today', async (_label, date) => {
    const { router } = renderApp(`/day/${date}`);

    expect(await findPageHeading('November 10, 2026')).toBeVisible();
    expect(router.state.location.pathname).toBe('/day/2026-11-10');
  });

  it.each([
    ['the first allowed date', '1940-01-01', 'January 1, 1940'],
    ['the last allowed date', '2026-11-24', 'November 24, 2026'],
  ])('accepts %s', async (_label, date, heading) => {
    const { router } = renderApp(`/day/${date}`);

    expect(await findPageHeading(heading)).toBeVisible();
    expect(router.state.location.pathname).toBe(`/day/${date}`);
  });

  it('replaces an invalid URL in history instead of adding an entry', async () => {
    const { router } = renderApp('/day/banana');

    await findPageHeading('November 10, 2026');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('redirects unknown paths to today', async () => {
    const { router } = renderApp('/no/such/page');

    expect(await findPageHeading('November 10, 2026')).toBeVisible();
    expect(router.state.location.pathname).toBe('/day/2026-11-10');
  });
});

describe('document title', () => {
  it('names the date on the briefing page', async () => {
    renderApp('/day/2024-05-01');

    await waitFor(() => expect(document.title).toBe('May 1, 2024 · Almanac'));
  });

  it('names the bookmarks page', async () => {
    renderApp('/bookmarks');

    await waitFor(() => expect(document.title).toBe('Bookmarks · Almanac'));
  });
});

describe('app shell', () => {
  it('renders a top bar with the app name and the page content in a main landmark', async () => {
    renderApp('/bookmarks');

    const banner = await screen.findByRole('banner');
    expect(within(banner).getByRole('link', { name: 'Almanac' })).toBeVisible();
    expect(
      within(screen.getByRole('main')).getByRole('heading', { name: 'Bookmarks' }),
    ).toBeVisible();
  });

  it('navigates to bookmarks from the top bar and marks the link as current', async () => {
    const { router, user } = renderApp('/day/2024-05-01');

    const link = await screen.findByRole('link', { name: 'Bookmarks' });
    expect(link).not.toHaveAttribute('aria-current');

    await user.click(link);

    expect(await findPageHeading('Bookmarks')).toBeVisible();
    expect(router.state.location.pathname).toBe('/bookmarks');
    expect(screen.getByRole('link', { name: 'Bookmarks' })).toHaveAttribute('aria-current', 'page');
  });

  it('returns to today when the app name is clicked', async () => {
    const { router, user } = renderApp('/bookmarks');

    await user.click(await screen.findByRole('link', { name: 'Almanac' }));

    expect(await findPageHeading('November 10, 2026')).toBeVisible();
    expect(router.state.location.pathname).toBe('/day/2026-11-10');
  });
});
