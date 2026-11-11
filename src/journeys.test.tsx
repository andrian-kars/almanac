import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { readStoredBookmarks } from './features/bookmarks/fixtures';
import { freezeTime } from './test/clock';
import { mockAllSources } from './test/mockAllSources';
import { renderApp } from './test/renderApp';

/**
 * Whole journeys through the app, the way a person would take them: across pages, through
 * the address bar's history, and back.
 */

const EVENT = 'The Empire State Building is dedicated in New York City.';

const findPageHeading = (name: string) => screen.findByRole('heading', { level: 1, name });
const getTopBarBookmarks = () =>
  within(screen.getByRole('banner')).getByRole('link', { name: 'Bookmarks' });
const findHistoryCard = () => screen.findByRole('region', { name: 'On This Day' });

beforeEach(() => {
  freezeTime(2026, 11, 10);
});

describe('saving something and finding it again', () => {
  it('goes from a day, to the bookmarks, to its summary, and back to the day', async () => {
    mockAllSources();
    const { router, user } = await renderApp('/day/2024-05-01');

    // 1. Save an event from the day page.
    const history = await findHistoryCard();
    await user.click(
      await within(history).findByRole('button', {
        name: 'Bookmark: Empire State Building, 1931',
      }),
    );
    expect(getTopBarBookmarks()).toHaveTextContent('1');
    expect(readStoredBookmarks()).toHaveLength(1);

    // 2. Find it on the bookmarks page.
    await user.click(getTopBarBookmarks());
    await findPageHeading('Bookmarks');
    const list = screen.getByRole('list', { name: 'Saved bookmarks' });
    expect(within(list).getByRole('heading', { name: EVENT })).toBeVisible();

    // 3. Read its summary, then close it.
    await user.click(within(list).getByRole('link', { name: 'Summary of Empire State Building' }));
    const dialog = await screen.findByRole('dialog', { name: 'Empire State Building' });
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/bookmarks');

    // 4. Jump back to the day it was saved from: it is still marked as saved there.
    await user.click(within(list).getByRole('link', { name: 'Open May 1, 2024' }));
    await findPageHeading('May 1, 2024');
    expect(
      await within(await findHistoryCard()).findByRole('button', {
        name: 'Bookmark: Empire State Building, 1931',
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    // 5. Back returns to the bookmarks page.
    await router.navigate(-1);
    expect(await findPageHeading('Bookmarks')).toBeVisible();
  });

  it('keeps bookmarks after the app is closed and opened again', async () => {
    mockAllSources();
    const first = await renderApp('/day/2024-05-01');
    await first.user.click(
      await within(await findHistoryCard()).findByRole('button', {
        name: 'Bookmark: Empire State Building, 1931',
      }),
    );

    // A new visit: only what the browser stored remains.
    first.router.dispose();
    document.body.innerHTML = '';
    await renderApp('/bookmarks');

    expect(await screen.findByRole('heading', { name: EVENT })).toBeVisible();
  });

  it('unsaving on the day page removes it from the bookmarks page too', async () => {
    mockAllSources();
    const { user } = await renderApp('/day/2024-05-01');
    const button = await within(await findHistoryCard()).findByRole('button', {
      name: 'Bookmark: Empire State Building, 1931',
    });

    await user.click(button);
    await user.click(button);
    await user.click(getTopBarBookmarks());

    expect(await screen.findByText('No bookmarks yet')).toBeVisible();
  });
});

describe('browsing through days', () => {
  it('moves day by day and back through history, keeping the address in step', async () => {
    mockAllSources();
    const { router, user } = await renderApp('/day/2024-05-01');
    await findPageHeading('May 1, 2024');

    await user.click(screen.getByRole('link', { name: 'Next day' }));
    await findPageHeading('May 2, 2024');
    await user.click(screen.getByRole('link', { name: 'Next day' }));
    await findPageHeading('May 3, 2024');

    await router.navigate(-1);
    expect(await findPageHeading('May 2, 2024')).toBeVisible();
    expect(router.state.location.pathname).toBe('/day/2024-05-02');

    await user.click(screen.getByRole('link', { name: 'Today' }));
    expect(await findPageHeading('November 10, 2026')).toBeVisible();
  });
});
