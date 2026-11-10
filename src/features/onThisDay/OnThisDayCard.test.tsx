import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { freezeTime } from '../../test/clock';
import { mockFetch, type MockReply, requestedUrls } from '../../test/mockFetch';
import { renderApp } from '../../test/renderApp';
import { rawBirths, rawEntry, rawFeed, rawPage } from './fixtures';

const FEED_URL = 'feed/onthisday/all';

const getCard = () => screen.getByRole('region', { name: 'On This Day' });
const findEntries = () => within(getCard()).findAllByRole('listitem');
const getEntries = () => within(getCard()).getAllByRole('listitem');
const getTab = (name: RegExp) => within(getCard()).getByRole('tab', { name });

beforeEach(() => {
  freezeTime(2026, 11, 10);
});

describe('loading the feed', () => {
  it('requests the feed for the month and day in the URL', async () => {
    const fetchMock = mockFetch({ [FEED_URL]: { json: rawFeed() } });
    await renderApp('/day/2024-05-01');
    await findEntries();

    expect(requestedUrls(fetchMock)).toEqual([
      'https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/05/01',
    ]);
  });

  it('shows a loading state until the feed arrives', async () => {
    // No route: the request stays pending.
    mockFetch({});
    await renderApp('/day/2024-05-01');

    expect(
      await within(getCard()).findByRole('status', { name: 'Loading On This Day' }),
    ).toBeInTheDocument();
    expect(within(getCard()).queryByRole('listitem')).not.toBeInTheDocument();
  });
});

describe('events', () => {
  beforeEach(() => {
    mockFetch({ [FEED_URL]: { json: rawFeed() } });
  });

  it('lists events first, newest year first, curated and regular together', async () => {
    await renderApp('/day/2024-05-01');
    const entries = await findEntries();

    expect(getTab(/Events/)).toHaveAttribute('aria-selected', 'true');
    expect(entries).toHaveLength(4);
    expect(entries[0]).toHaveTextContent('2011');
    expect(entries[0]).toHaveTextContent('Pope John Paul II is beatified by his successor.');
    expect(entries[1]).toHaveTextContent('1931');
    expect(entries[1]).toHaveTextContent('The Empire State Building is dedicated');
  });

  it('writes years before the common era as BC', async () => {
    await renderApp('/day/2024-05-01');
    const entries = await findEntries();

    expect(entries[3]).toHaveTextContent('44 BC');
  });

  it('shows the article thumbnail when there is one', async () => {
    await renderApp('/day/2024-05-01');
    const entries = await findEntries();

    expect(entries[1]?.querySelector('img')).toHaveAttribute(
      'src',
      'https://upload.wikimedia.org/thumb/Empire_State_Building.jpg',
    );
    // "Acts of Union 1707" has no thumbnail in the feed.
    expect(entries[2]?.querySelector('img')).not.toBeInTheDocument();
  });

  it('links each entry to its Wikipedia article in a new tab', async () => {
    await renderApp('/day/2024-05-01');
    const entries = await findEntries();

    const link = within(entries[1] as HTMLElement).getByRole('link', {
      name: 'Empire State Building on Wikipedia',
    });
    expect(link).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Empire_State_Building');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    // The BC entry has no linked article.
    expect(within(entries[3] as HTMLElement).queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('tabs', () => {
  beforeEach(() => {
    mockFetch({ [FEED_URL]: { json: rawFeed() } });
  });

  it('shows how many entries each tab holds', async () => {
    await renderApp('/day/2024-05-01');
    await findEntries();

    expect(getTab(/Events/)).toHaveTextContent('4');
    expect(getTab(/Births/)).toHaveTextContent('12');
    expect(getTab(/Deaths/)).toHaveTextContent('1');
  });

  it('switches to deaths', async () => {
    const { user } = await renderApp('/day/2024-05-01');
    await findEntries();

    await user.click(getTab(/Deaths/));

    expect(getTab(/Deaths/)).toHaveAttribute('aria-selected', 'true');
    expect(getEntries()).toHaveLength(1);
    expect(getEntries()[0]).toHaveTextContent('Ayrton Senna, Brazilian racing driver');
  });

  it('connects the selected tab to its panel for assistive technology', async () => {
    const { user } = await renderApp('/day/2024-05-01');
    await findEntries();

    await user.click(getTab(/Births/));

    expect(within(getCard()).getByRole('tabpanel', { name: /Births/ })).toBeVisible();
  });
});

describe('show more', () => {
  beforeEach(() => {
    mockFetch({ [FEED_URL]: { json: { ...rawFeed(), births: rawBirths(35) } } });
  });

  it('shows the first 10 entries, then 20 more per click, until none are left', async () => {
    const { user } = await renderApp('/day/2024-05-01');
    await findEntries();
    await user.click(getTab(/Births/));

    expect(getEntries()).toHaveLength(10);

    await user.click(within(getCard()).getByRole('button', { name: /Show more/ }));
    expect(getEntries()).toHaveLength(30);

    await user.click(within(getCard()).getByRole('button', { name: /Show more/ }));
    expect(getEntries()).toHaveLength(35);
    expect(within(getCard()).queryByRole('button', { name: /Show more/ })).not.toBeInTheDocument();
  });

  it('says how many entries are still hidden', async () => {
    const { user } = await renderApp('/day/2024-05-01');
    await findEntries();
    await user.click(getTab(/Births/));

    expect(within(getCard()).getByRole('button', { name: /Show more/ })).toHaveTextContent('25');
  });

  it('has no Show more button for a short list', async () => {
    await renderApp('/day/2024-05-01');
    await findEntries();

    expect(within(getCard()).queryByRole('button', { name: /Show more/ })).not.toBeInTheDocument();
  });

  it('collapses again when switching tabs', async () => {
    const { user } = await renderApp('/day/2024-05-01');
    await findEntries();
    await user.click(getTab(/Births/));
    await user.click(within(getCard()).getByRole('button', { name: /Show more/ }));

    await user.click(getTab(/Events/));
    await user.click(getTab(/Births/));

    expect(getEntries()).toHaveLength(10);
  });
});

describe('changing the date', () => {
  it('loads the new day, keeps the chosen tab and collapses the list', async () => {
    const fetchMock = mockFetch({
      'all/05/01': { json: { ...rawFeed(), births: rawBirths(35) } },
      'all/05/02': { json: { births: rawBirths(15, 1980) } },
    });
    const { user } = await renderApp('/day/2024-05-01');
    await findEntries();
    await user.click(getTab(/Births/));
    await user.click(within(getCard()).getByRole('button', { name: /Show more/ }));

    await user.click(screen.getByRole('link', { name: 'Next day' }));

    await waitFor(() => expect(getEntries()[0]).toHaveTextContent('Person 1980'));
    expect(getTab(/Births/)).toHaveAttribute('aria-selected', 'true');
    expect(getEntries()).toHaveLength(10);
    expect(requestedUrls(fetchMock).at(-1)).toContain('all/05/02');
  });

  it('does not fetch a day again when coming back to it', async () => {
    const fetchMock = mockFetch({ [FEED_URL]: { json: rawFeed() } });
    const { user } = await renderApp('/day/2024-05-01');
    await findEntries();

    await user.click(screen.getByRole('link', { name: 'Next day' }));
    await screen.findByRole('heading', { level: 1, name: 'May 2, 2024' });
    await findEntries();
    await user.click(screen.getByRole('link', { name: 'Previous day' }));
    await screen.findByRole('heading', { level: 1, name: 'May 1, 2024' });
    await findEntries();

    expect(requestedUrls(fetchMock).filter((url) => url.endsWith('/05/01'))).toHaveLength(1);
  });

  it('uses one request for the same day in different years', async () => {
    const fetchMock = mockFetch({ [FEED_URL]: { json: rawFeed() } });
    const { router } = await renderApp('/day/2024-05-01');
    await findEntries();

    await router.navigate('/day/1999-05-01');
    await screen.findByRole('heading', { level: 1, name: 'May 1, 1999' });
    await findEntries();

    expect(requestedUrls(fetchMock)).toHaveLength(1);
  });
});

describe('empty results', () => {
  it('says so when a tab has no entries', async () => {
    mockFetch({ [FEED_URL]: { json: { events: [rawEntry(1999, 'Only event.')] } } });
    const { user } = await renderApp('/day/2024-05-01');
    await findEntries();

    await user.click(getTab(/Deaths/));

    expect(within(getCard()).getByText('No deaths are recorded for this day.')).toBeVisible();
    expect(within(getCard()).queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('says so when the whole feed is empty', async () => {
    mockFetch({ [FEED_URL]: { json: {} } });
    await renderApp('/day/2024-05-01');

    expect(
      await within(getCard()).findByText('Wikipedia has nothing recorded for this day.'),
    ).toBeVisible();
    expect(within(getCard()).queryByRole('tab')).not.toBeInTheDocument();
  });
});

describe('errors', () => {
  it('retries a server error once, then shows it with a Retry button that recovers', async () => {
    let reply: MockReply = { status: 503 };
    const fetchMock = mockFetch({ [FEED_URL]: () => reply });
    const { user } = await renderApp('/day/2024-05-01');

    const alert = await within(getCard()).findByRole('alert');
    expect(alert).toHaveTextContent(/having problems/i);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    reply = { json: rawFeed() };
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(await findEntries()).toHaveLength(4);
    expect(within(getCard()).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not retry a client error such as 404', async () => {
    const fetchMock = mockFetch({ [FEED_URL]: { status: 404 } });
    await renderApp('/day/2024-05-01');

    expect(await within(getCard()).findByRole('alert')).toHaveTextContent(/nothing was found/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('explains a network failure', async () => {
    mockFetch({ [FEED_URL]: { error: new TypeError('Failed to fetch') } });
    await renderApp('/day/2024-05-01');

    expect(await within(getCard()).findByRole('alert')).toHaveTextContent(/connection/i);
  });

  it('shows an error, not a crash, when the feed has an unexpected shape', async () => {
    mockFetch({ [FEED_URL]: { json: ['not', 'an', 'object'] } });
    await renderApp('/day/2024-05-01');

    expect(await within(getCard()).findByRole('alert')).toHaveTextContent(/unexpected/i);
  });

  it('keeps the rest of the page usable when the feed fails', async () => {
    mockFetch({ [FEED_URL]: { status: 500 } });
    const { user } = await renderApp('/day/2024-05-01');
    await within(getCard()).findByRole('alert');

    await user.click(screen.getByRole('link', { name: 'Next day' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'May 2, 2024' })).toBeVisible();
  });
});

describe('article thumbnails', () => {
  it('are decorative and load lazily', async () => {
    mockFetch({
      [FEED_URL]: { json: { events: [rawEntry(1999, 'With picture.', [rawPage('Paris')])] } },
    });
    await renderApp('/day/2024-05-01');
    const [entry] = await findEntries();

    const image = entry?.querySelector('img');
    // The article name is in the entry's link, so the image adds nothing for screen readers.
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveAttribute('loading', 'lazy');
  });
});
