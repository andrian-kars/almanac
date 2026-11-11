import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleBookmarks, seedBookmarks } from '../features/bookmarks/fixtures';
import { rawFeed } from '../features/onThisDay/fixtures';
import { freezeTime } from '../test/clock';
import { mockFetch } from '../test/mockFetch';
import { renderApp } from '../test/renderApp';

const findPageHeading = (name: string) => screen.findByRole('heading', { level: 1, name });
/** The polite live region that tells screen reader users a new page has opened. */
const getAnnouncer = () => screen.getByRole('status', { name: 'Page announcements' });

beforeEach(() => {
  freezeTime(2026, 11, 10);
});

describe('skip link', () => {
  it('is the first thing the keyboard reaches', async () => {
    const { user } = await renderApp('/bookmarks');
    await findPageHeading('Bookmarks');

    await user.tab();

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveFocus();
  });

  it('moves focus past the top bar to the page content', async () => {
    const { router, user } = await renderApp('/bookmarks');
    await findPageHeading('Bookmarks');

    await user.tab();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('main')).toHaveFocus();
    // It is not a navigation: the address keeps no "#main".
    expect(router.state.location.hash).toBe('');
  });
});

describe('after navigating', () => {
  it('announces the new page to screen readers', async () => {
    const { user } = await renderApp('/day/2024-05-01');
    await findPageHeading('May 1, 2024');

    await user.click(screen.getByRole('link', { name: 'Next day' }));
    await findPageHeading('May 2, 2024');

    await waitFor(() => expect(getAnnouncer()).toHaveTextContent('May 2, 2024 · Almanac'));
  });

  it('announces nothing on the first page, which screen readers read anyway', async () => {
    await renderApp('/day/2024-05-01');
    await findPageHeading('May 1, 2024');

    expect(getAnnouncer()).toBeEmptyDOMElement();
  });

  it('announces nothing when only the address’s options change', async () => {
    seedBookmarks(sampleBookmarks());
    const { user } = await renderApp('/bookmarks');
    await findPageHeading('Bookmarks');

    await user.click(
      within(screen.getByRole('group', { name: 'Filter by type' })).getByRole('button', {
        name: /Births/,
      }),
    );

    expect(getAnnouncer()).toBeEmptyDOMElement();
  });

  it('keeps focus on a link that is still there, such as Next day', async () => {
    const { user } = await renderApp('/day/2024-05-01');
    await findPageHeading('May 1, 2024');

    await user.click(screen.getByRole('link', { name: 'Next day' }));
    await findPageHeading('May 2, 2024');

    expect(screen.getByRole('link', { name: 'Next day' })).toHaveFocus();
  });

  it('moves focus to the new page’s heading when the link used has gone', async () => {
    seedBookmarks(sampleBookmarks());
    const { user } = await renderApp('/bookmarks');
    await findPageHeading('Bookmarks');

    await user.click(await screen.findByRole('link', { name: 'Open July 20, 1969' }));

    await waitFor(async () => expect(await findPageHeading('July 20, 1969')).toHaveFocus());
  });
});

describe('scroll position', () => {
  const scrollTo = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('scrollTo', scrollTo);
  });

  it('starts a new page at the top', async () => {
    seedBookmarks(sampleBookmarks());
    const { user } = await renderApp('/bookmarks');
    await findPageHeading('Bookmarks');
    scrollTo.mockClear();

    await user.click(await screen.findByRole('link', { name: 'Open July 20, 1969' }));
    await findPageHeading('July 20, 1969');

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('stays put when a summary opens over the page', async () => {
    mockFetch({ 'feed/onthisday': { json: rawFeed() } });
    const { user } = await renderApp('/day/2024-05-01');
    const card = screen.getByRole('region', { name: 'On This Day' });
    const link = await within(card).findByRole('link', { name: 'Empire State Building' });
    scrollTo.mockClear();

    await user.click(link);
    await screen.findByRole('dialog');

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
