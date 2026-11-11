import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { freezeInstant } from '../../test/clock';
import { mockFetch } from '../../test/mockFetch';
import { renderApp } from '../../test/renderApp';
import { rawApod, rawApodVideo } from '../apod/fixtures';
import { rawFeed } from '../onThisDay/fixtures';
import { BOOKMARKS_STORAGE_KEY } from './store';

const stored = () =>
  JSON.parse(localStorage.getItem(BOOKMARKS_STORAGE_KEY) ?? '[]') as Array<Record<string, unknown>>;

const getHistory = () => screen.getByRole('region', { name: 'On This Day' });
const findEntries = () => within(getHistory()).findAllByRole('listitem');
const getEntries = () => within(getHistory()).getAllByRole('listitem');
const bookmarkButton = (within_: HTMLElement) =>
  within(within_).getByRole('button', { name: /^Bookmark/ });
const findApod = () => screen.findByRole('region', { name: 'Astronomy Picture of the Day' });
const getNavLink = () =>
  within(screen.getByRole('banner')).getByRole('link', { name: 'Bookmarks' });

beforeEach(() => {
  freezeInstant('2026-11-10T12:00:00Z');
  mockFetch({
    'feed/onthisday': { json: rawFeed() },
    'api.nasa.gov': { json: rawApod() },
  });
});

describe('On This Day entries', () => {
  it('gives every entry an unpressed bookmark button named after it', async () => {
    await renderApp('/day/2024-05-01');
    const entries = await findEntries();

    for (const entry of entries) {
      expect(bookmarkButton(entry)).toHaveAttribute('aria-pressed', 'false');
    }
    expect(bookmarkButton(entries[1] as HTMLElement)).toHaveAccessibleName(
      'Bookmark: Empire State Building, 1931',
    );
  });

  it('saves the entry with what the bookmarks page needs to show it', async () => {
    const { user } = await renderApp('/day/2024-05-01');
    const entries = await findEntries();

    await user.click(bookmarkButton(entries[1] as HTMLElement));

    expect(bookmarkButton(getEntries()[1] as HTMLElement)).toHaveAttribute('aria-pressed', 'true');
    expect(stored()).toEqual([
      {
        id: 'event:05-01:1931:Empire_State_Building',
        kind: 'event',
        date: '2024-05-01',
        year: 1931,
        title: 'The Empire State Building is dedicated in New York City.',
        subtitle: 'Empire State Building',
        description: 'Skyscraper in Manhattan',
        imageUrl: 'https://upload.wikimedia.org/thumb/Empire_State_Building.jpg',
        sourceUrl: 'https://en.wikipedia.org/wiki/Empire_State_Building',
        savedAt: '2026-11-10T12:00:00.000Z',
      },
    ]);
  });

  it('marks only the saved entry', async () => {
    const { user } = await renderApp('/day/2024-05-01');
    const entries = await findEntries();

    await user.click(bookmarkButton(entries[1] as HTMLElement));

    const pressed = getEntries().map((entry) => bookmarkButton(entry).getAttribute('aria-pressed'));
    expect(pressed).toEqual(['false', 'true', 'false', 'false']);
  });

  it('removes the bookmark when clicked again', async () => {
    const { user } = await renderApp('/day/2024-05-01');
    const entries = await findEntries();

    await user.click(bookmarkButton(entries[1] as HTMLElement));
    await user.click(bookmarkButton(getEntries()[1] as HTMLElement));

    expect(bookmarkButton(getEntries()[1] as HTMLElement)).toHaveAttribute('aria-pressed', 'false');
    expect(stored()).toEqual([]);
  });

  it('saves an entry that links no article', async () => {
    const { user } = await renderApp('/day/2024-05-01');
    const entries = await findEntries();

    // The 44 BC entry has no linked page, so it is named by its text.
    const button = bookmarkButton(entries[3] as HTMLElement);
    expect(button).toHaveAccessibleName(/^Bookmark: An event before the common era.*, 44 BC$/);
    await user.click(button);

    expect(stored()[0]).toMatchObject({ kind: 'event', year: -44 });
  });

  it('shows saved entries as saved on the next visit', async () => {
    localStorage.setItem(
      BOOKMARKS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'event:05-01:1931:Empire_State_Building',
          kind: 'event',
          date: '2024-05-01',
          title: 'The Empire State Building is dedicated in New York City.',
          savedAt: '2026-11-01T08:00:00.000Z',
        },
      ]),
    );
    await renderApp('/day/2024-05-01');
    const entries = await findEntries();

    expect(bookmarkButton(entries[1] as HTMLElement)).toHaveAttribute('aria-pressed', 'true');
    expect(bookmarkButton(entries[0] as HTMLElement)).toHaveAttribute('aria-pressed', 'false');
  });

  it('recognises a saved entry when the same day is viewed from another year', async () => {
    const { router, user } = await renderApp('/day/2024-05-01');
    await user.click(bookmarkButton((await findEntries())[1] as HTMLElement));

    await router.navigate('/day/1999-05-01');
    await screen.findByRole('heading', { level: 1, name: 'May 1, 1999' });

    const building = (await findEntries()).find((entry) =>
      entry.textContent.includes('Empire State Building'),
    );
    expect(bookmarkButton(building as HTMLElement)).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps working for the session when the browser blocks storage', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    const { user } = await renderApp('/day/2024-05-01');
    const entries = await findEntries();

    await user.click(bookmarkButton(entries[0] as HTMLElement));

    expect(bookmarkButton(getEntries()[0] as HTMLElement)).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('picture of the day', () => {
  it('saves the picture', async () => {
    const { user } = await renderApp('/day/2024-05-01');
    const card = await findApod();
    await within(card).findByRole('heading', { name: 'A Hole in Mars' });

    const button = bookmarkButton(card);
    expect(button).toHaveAccessibleName('Bookmark: A Hole in Mars');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);

    expect(bookmarkButton(card)).toHaveAttribute('aria-pressed', 'true');
    expect(stored()[0]).toMatchObject({
      id: 'apod:2024-05-01',
      kind: 'apod',
      date: '2024-05-01',
      title: 'A Hole in Mars',
      imageUrl: 'https://apod.nasa.gov/apod/image/2405/MarsHole_1080.jpg',
      sourceUrl: 'https://apod.nasa.gov/apod/ap240501.html',
    });
  });

  it('saves a video with its still frame', async () => {
    mockFetch({ 'api.nasa.gov': { json: rawApodVideo() } });
    const { user } = await renderApp('/day/2024-05-01');
    const card = await findApod();
    await within(card).findByRole('heading', { name: 'Flying Over the Moon' });

    await user.click(bookmarkButton(card));

    expect(stored()[0]).toMatchObject({
      kind: 'apod',
      imageUrl: 'https://img.youtube.com/vi/abc123/0.jpg',
    });
  });

  it('has no bookmark button when there is no picture', async () => {
    await renderApp('/day/1969-07-20');
    const card = await findApod();
    await within(card).findByText(/archive begins/);

    expect(within(card).queryByRole('button', { name: /^Bookmark/ })).not.toBeInTheDocument();
  });
});

describe('bookmark count in the top bar', () => {
  it('shows nothing while there are no bookmarks', async () => {
    await renderApp('/day/2024-05-01');
    await findEntries();

    expect(getNavLink()).toHaveTextContent(/^Bookmarks$/);
  });

  it('counts bookmarks as they are saved and removed, keeping the link’s name', async () => {
    const { user } = await renderApp('/day/2024-05-01');
    const entries = await findEntries();

    await user.click(bookmarkButton(entries[0] as HTMLElement));
    await user.click(bookmarkButton(entries[1] as HTMLElement));
    await waitFor(() => expect(getNavLink()).toHaveTextContent('2'));
    expect(getNavLink()).toHaveAccessibleName('Bookmarks');
    expect(getNavLink()).toHaveAccessibleDescription('2 saved');

    await user.click(bookmarkButton(getEntries()[0] as HTMLElement));
    await waitFor(() => expect(getNavLink()).toHaveTextContent('1'));
  });
});
