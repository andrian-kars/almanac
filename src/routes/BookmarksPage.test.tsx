import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  readStoredBookmarks,
  sampleBookmarks,
  savedBookmark,
  seedBookmarks,
} from '../features/bookmarks/fixtures';
import { rawFeed } from '../features/onThisDay/fixtures';
import { freezeTime } from '../test/clock';
import { mockFetch } from '../test/mockFetch';
import { renderApp } from '../test/renderApp';

const findList = () => screen.findByRole('list', { name: 'Saved bookmarks' });
const getCards = () =>
  within(screen.getByRole('list', { name: 'Saved bookmarks' })).getAllByRole('article');
const cardTitles = () =>
  getCards().map((card) => within(card).getByRole('heading', { level: 2 }).textContent);
const getFilter = (name: RegExp) =>
  within(screen.getByRole('group', { name: 'Filter by type' })).getByRole('button', { name });
const getCard = (title: string) => {
  const card = getCards().find((item) => within(item).queryByRole('heading', { name: title }));
  if (!card) throw new Error(`No bookmark card titled "${title}"`);
  return card;
};

beforeEach(() => {
  freezeTime(2026, 11, 10);
});

describe('with no bookmarks', () => {
  it('explains how to save one and links to today', async () => {
    const { router, user } = await renderApp('/bookmarks');

    expect(await screen.findByText('No bookmarks yet')).toBeVisible();
    expect(screen.getByText(/bookmark icon/i)).toBeVisible();
    expect(screen.queryByRole('list', { name: 'Saved bookmarks' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Filter by type' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Browse today' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/day/2026-11-10'));
  });
});

describe('browsing', () => {
  beforeEach(() => {
    seedBookmarks(sampleBookmarks());
  });

  it('lists bookmarks newest first and says how many there are', async () => {
    await renderApp('/bookmarks');
    await findList();

    expect(cardTitles()).toEqual([
      'A Hole in Mars',
      'Ayrton Senna, Brazilian racing driver',
      'Edmund Hillary, New Zealand mountaineer',
      'The Empire State Building is dedicated in New York City.',
    ]);
    expect(screen.getByText('4 bookmarks')).toBeVisible();
  });

  it('shows what each bookmark is: type, year, description and picture', async () => {
    await renderApp('/bookmarks');
    await findList();

    const senna = getCard('Ayrton Senna, Brazilian racing driver');
    expect(within(senna).getByText('Death')).toBeVisible();
    expect(within(senna).getByText('1994')).toBeVisible();
    expect(within(senna).getByText('Brazilian racing driver (1960–1994)')).toBeVisible();
    expect(senna.querySelector('img')).toHaveAttribute(
      'src',
      'https://upload.wikimedia.org/thumb/Ayrton_Senna.jpg',
    );

    const picture = getCard('A Hole in Mars');
    expect(within(picture).getByText('Picture of the day')).toBeVisible();
  });

  it('copes with a bookmark that has no picture or description', async () => {
    await renderApp('/bookmarks');
    await findList();

    const hillary = getCard('Edmund Hillary, New Zealand mountaineer');
    expect(hillary.querySelector('img')).not.toBeInTheDocument();
    expect(within(hillary).getByText('Birth')).toBeVisible();
  });

  it('writes years before the common era as BC', async () => {
    seedBookmarks([savedBookmark({ id: 'old', year: -44, title: 'An ancient event.' })]);
    await renderApp('/bookmarks');
    await findList();

    expect(within(getCard('An ancient event.')).getByText('44 BC')).toBeVisible();
  });

  it('records when each bookmark was saved', async () => {
    await renderApp('/bookmarks');
    await findList();

    const time = getCard('A Hole in Mars').querySelector('time');
    expect(time).toHaveAttribute('datetime', '2026-11-10T15:00:00.000Z');
    expect(time?.parentElement).toHaveTextContent(/^Saved /);
  });

  it('keeps pictures decorative and lazy', async () => {
    await renderApp('/bookmarks');
    await findList();

    const image = getCard('A Hole in Mars').querySelector('img');
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('drops a picture that no longer loads, instead of showing a broken image', async () => {
    await renderApp('/bookmarks');
    await findList();
    const image = getCard('A Hole in Mars').querySelector('img');
    if (!image) throw new Error('expected an image');

    // Saved image addresses can go stale months later.
    fireEvent.error(image);

    expect(getCard('A Hole in Mars').querySelector('img')).not.toBeInTheDocument();
    expect(within(getCard('A Hole in Mars')).getByText('Picture of the day')).toBeVisible();
  });

  it('needs no network at all', async () => {
    const fetchMock = mockFetch({});
    await renderApp('/bookmarks');
    await findList();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows only the valid entries when stored data is partly damaged', async () => {
    localStorage.setItem(
      'almanac.bookmarks.v1',
      JSON.stringify([{ nonsense: true }, savedBookmark(), null]),
    );
    await renderApp('/bookmarks');
    await findList();

    expect(cardTitles()).toEqual(['The Empire State Building is dedicated in New York City.']);
    expect(screen.getByText('1 bookmark')).toBeVisible();
  });
});

describe('links', () => {
  beforeEach(() => {
    seedBookmarks(sampleBookmarks());
    mockFetch({ 'feed/onthisday': { json: rawFeed() } });
  });

  it('jumps back to the day a bookmark was saved from', async () => {
    const { router, user } = await renderApp('/bookmarks');
    await findList();

    const link = within(getCard('Edmund Hillary, New Zealand mountaineer')).getByRole('link', {
      name: 'Open July 20, 1969',
    });
    await user.click(link);

    expect(await screen.findByRole('heading', { level: 1, name: 'July 20, 1969' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/day/1969-07-20');
  });

  it('tells apart day links with the same text by the bookmark they belong to', async () => {
    await renderApp('/bookmarks');
    await findList();

    expect(
      within(getCard('Edmund Hillary, New Zealand mountaineer')).getByRole('link', {
        name: 'Open July 20, 1969',
      }),
    ).toHaveAccessibleDescription('Edmund Hillary, New Zealand mountaineer');
  });

  it('links to the source in a new tab, named by where it goes', async () => {
    await renderApp('/bookmarks');
    await findList();

    const wikipedia = within(getCard('Ayrton Senna, Brazilian racing driver')).getByRole('link', {
      name: 'Ayrton Senna on Wikipedia',
    });
    expect(wikipedia).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Ayrton_Senna');
    expect(wikipedia).toHaveAttribute('target', '_blank');
    expect(wikipedia).toHaveAttribute('rel', expect.stringContaining('noopener'));

    expect(
      within(getCard('A Hole in Mars')).getByRole('link', { name: 'A Hole in Mars on NASA APOD' }),
    ).toHaveAttribute('href', 'https://apod.nasa.gov/apod/ap240501.html');
  });

  it('has no source link when the bookmark has none', async () => {
    seedBookmarks([savedBookmark({ sourceUrl: undefined })]);
    await renderApp('/bookmarks');
    await findList();

    expect(within(getCards()[0] as HTMLElement).getAllByRole('link')).toHaveLength(1);
  });

  it('shows an item saved on a day page', async () => {
    seedBookmarks([]);
    const { user } = await renderApp('/day/2024-05-01');
    const history = await screen.findByRole('region', { name: 'On This Day' });
    const [firstEntry] = await within(history).findAllByRole('listitem');

    await user.click(within(firstEntry as HTMLElement).getByRole('button', { name: /^Bookmark/ }));
    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Bookmarks' }));
    await findList();

    expect(cardTitles()).toEqual(['Pope John Paul II is beatified by his successor.']);
  });
});

describe('filtering by type', () => {
  beforeEach(() => {
    seedBookmarks([
      ...sampleBookmarks(),
      savedBookmark({
        id: 'event:2',
        title: 'A second event.',
        savedAt: '2026-11-09T12:00:00.000Z',
      }),
    ]);
  });

  it('offers every type with its count, starting on All', async () => {
    await renderApp('/bookmarks');
    await findList();

    expect(getFilter(/^All/)).toHaveAttribute('aria-pressed', 'true');
    expect(getFilter(/^All/)).toHaveTextContent('5');
    expect(getFilter(/^Events/)).toHaveTextContent('2');
    expect(getFilter(/^Births/)).toHaveTextContent('1');
    expect(getFilter(/^Deaths/)).toHaveTextContent('1');
    expect(getFilter(/^Pictures/)).toHaveTextContent('1');
  });

  it('shows only the chosen type, and everything again on All', async () => {
    const { user } = await renderApp('/bookmarks');
    await findList();

    await user.click(getFilter(/^Events/));
    expect(getFilter(/^Events/)).toHaveAttribute('aria-pressed', 'true');
    expect(cardTitles()).toEqual([
      'The Empire State Building is dedicated in New York City.',
      'A second event.',
    ]);

    await user.click(getFilter(/^All/));
    expect(cardTitles()).toHaveLength(5);
  });

  it('keeps the filter in the address, so a reload or shared link keeps it', async () => {
    const { router, user } = await renderApp('/bookmarks');
    await findList();

    await user.click(getFilter(/^Births/));
    expect(router.state.location.search).toBe('?type=birth');

    await user.click(getFilter(/^All/));
    expect(router.state.location.search).toBe('');
  });

  it('applies the filter from the address', async () => {
    await renderApp('/bookmarks?type=apod');
    await findList();

    expect(getFilter(/^Pictures/)).toHaveAttribute('aria-pressed', 'true');
    expect(cardTitles()).toEqual(['A Hole in Mars']);
  });

  it('ignores an unknown type in the address', async () => {
    await renderApp('/bookmarks?type=weather');
    await findList();

    expect(getFilter(/^All/)).toHaveAttribute('aria-pressed', 'true');
    expect(cardTitles()).toHaveLength(5);
  });

  it('keeps a filter selected when it is clicked again', async () => {
    const { user } = await renderApp('/bookmarks');
    await findList();

    await user.click(getFilter(/^Deaths/));
    await user.click(getFilter(/^Deaths/));

    expect(getFilter(/^Deaths/)).toHaveAttribute('aria-pressed', 'true');
    expect(cardTitles()).toEqual(['Ayrton Senna, Brazilian racing driver']);
  });

  it('says so when nothing of the chosen type is saved', async () => {
    seedBookmarks([savedBookmark()]);
    const { user } = await renderApp('/bookmarks');
    await findList();

    await user.click(getFilter(/^Pictures/));

    expect(screen.getByText('No saved pictures.')).toBeVisible();
    expect(screen.queryByRole('list', { name: 'Saved bookmarks' })).not.toBeInTheDocument();
    // The filters stay, so the user can get back.
    expect(getFilter(/^All/)).toBeVisible();
  });
});

describe('removing', () => {
  beforeEach(() => {
    seedBookmarks(sampleBookmarks());
  });

  const removeButton = (title: string, label: string) =>
    within(getCard(title)).getByRole('button', { name: `Remove bookmark: ${label}` });

  it('removes a bookmark from the page, the storage and the top-bar count', async () => {
    const { user } = await renderApp('/bookmarks');
    await findList();

    await user.click(removeButton('Ayrton Senna, Brazilian racing driver', 'Ayrton Senna'));

    expect(cardTitles()).not.toContain('Ayrton Senna, Brazilian racing driver');
    expect(readStoredBookmarks().map((bookmark) => bookmark.id)).not.toContain(
      'death:05-01:1994:Ayrton_Senna',
    );
    expect(screen.getByText('3 bookmarks')).toBeVisible();
    expect(
      within(screen.getByRole('banner')).getByRole('link', { name: 'Bookmarks' }),
    ).toHaveTextContent('3');
  });

  it('offers Undo, which puts the bookmark back where it was', async () => {
    const { user } = await renderApp('/bookmarks');
    await findList();
    const before = readStoredBookmarks();

    await user.click(removeButton('Ayrton Senna, Brazilian racing driver', 'Ayrton Senna'));
    const notice = await screen.findByRole('alert');
    expect(notice).toHaveTextContent('Bookmark removed');
    await user.click(within(notice).getByRole('button', { name: 'Undo' }));

    expect(cardTitles()).toEqual([
      'A Hole in Mars',
      'Ayrton Senna, Brazilian racing driver',
      'Edmund Hillary, New Zealand mountaineer',
      'The Empire State Building is dedicated in New York City.',
    ]);
    expect(readStoredBookmarks()).toEqual(before);
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('undoes only the latest removal', async () => {
    const { user } = await renderApp('/bookmarks');
    await findList();

    await user.click(removeButton('A Hole in Mars', 'A Hole in Mars'));
    await user.click(removeButton('Ayrton Senna, Brazilian racing driver', 'Ayrton Senna'));
    await user.click(
      within(await screen.findByRole('alert')).getByRole('button', { name: 'Undo' }),
    );

    expect(cardTitles()).toEqual([
      'Ayrton Senna, Brazilian racing driver',
      'Edmund Hillary, New Zealand mountaineer',
      'The Empire State Building is dedicated in New York City.',
    ]);
  });

  it('shows the empty state after the last bookmark is removed, and Undo still works', async () => {
    seedBookmarks([savedBookmark()]);
    const { user } = await renderApp('/bookmarks');
    await findList();

    await user.click(
      removeButton(
        'The Empire State Building is dedicated in New York City.',
        'Empire State Building',
      ),
    );
    expect(await screen.findByText('No bookmarks yet')).toBeVisible();

    await user.click(
      within(await screen.findByRole('alert')).getByRole('button', { name: 'Undo' }),
    );
    expect(cardTitles()).toEqual(['The Empire State Building is dedicated in New York City.']);
  });

  it('lets the notice fade out after Undo instead of vanishing at once', async () => {
    const { user } = await renderApp('/bookmarks');
    await findList();

    await user.click(removeButton('A Hole in Mars', 'A Hole in Mars'));
    await user.click(
      within(await screen.findByRole('alert')).getByRole('button', { name: 'Undo' }),
    );

    // Still there, with its text, while it closes.
    expect(screen.getByRole('alert')).toHaveTextContent('Bookmark removed');
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  describe('keeps the keyboard in place', () => {
    it('moves focus to the next bookmark’s remove button', async () => {
      const { user } = await renderApp('/bookmarks');
      await findList();

      await user.click(removeButton('Ayrton Senna, Brazilian racing driver', 'Ayrton Senna'));

      expect(
        removeButton('Edmund Hillary, New Zealand mountaineer', 'Edmund Hillary'),
      ).toHaveFocus();
    });

    it('moves focus to the previous one after removing the last in the list', async () => {
      const { user } = await renderApp('/bookmarks');
      await findList();

      await user.click(
        removeButton(
          'The Empire State Building is dedicated in New York City.',
          'Empire State Building',
        ),
      );

      expect(
        removeButton('Edmund Hillary, New Zealand mountaineer', 'Edmund Hillary'),
      ).toHaveFocus();
    });

    it('moves focus to the page heading when nothing is left', async () => {
      seedBookmarks([savedBookmark()]);
      const { user } = await renderApp('/bookmarks');
      await findList();

      await user.click(
        removeButton(
          'The Empire State Building is dedicated in New York City.',
          'Empire State Building',
        ),
      );

      expect(screen.getByRole('heading', { level: 1, name: 'Bookmarks' })).toHaveFocus();
    });

    it('moves focus within the filtered list', async () => {
      const { user } = await renderApp('/bookmarks?type=death');
      await findList();

      await user.click(removeButton('Ayrton Senna, Brazilian racing driver', 'Ayrton Senna'));

      expect(screen.getByRole('heading', { level: 1, name: 'Bookmarks' })).toHaveFocus();
    });
  });

  it('names the remove button by the title when there is no article name', async () => {
    seedBookmarks([savedBookmark({ subtitle: undefined, title: 'A plain event.' })]);
    await renderApp('/bookmarks');
    await findList();

    expect(removeButton('A plain event.', 'A plain event.')).toBeVisible();
  });
});
