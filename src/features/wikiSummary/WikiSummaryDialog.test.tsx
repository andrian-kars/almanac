import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { sampleBookmarks, seedBookmarks } from '../bookmarks/fixtures';
import { rawFeed } from '../onThisDay/fixtures';
import { freezeTime } from '../../test/clock';
import { mockFetch, type MockReply, requestedUrls } from '../../test/mockFetch';
import { renderApp } from '../../test/renderApp';
import { rawDisambiguation, rawSummary } from './fixtures';

const FEED = 'feed/onthisday/all';
const SUMMARY = 'page/summary';
const DAY = '/day/2024-05-01';

const summaryUrls = (fetchMock: ReturnType<typeof mockFetch>) =>
  requestedUrls(fetchMock).filter((url) => url.includes(SUMMARY));

const findArticleLink = (name: string) =>
  within(screen.getByRole('region', { name: 'On This Day' })).findByRole('link', { name });
const findDialog = (name: string) => screen.findByRole('dialog', { name });
const expectNoDialog = () =>
  waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

function mockWikipedia(summary: MockReply | (() => MockReply) = { json: rawSummary() }) {
  return mockFetch({ [FEED]: { json: rawFeed() }, [SUMMARY]: summary });
}

beforeEach(() => {
  freezeTime(2026, 11, 10);
});

describe('opening a summary', () => {
  it('asks Wikipedia for nothing until an article is opened', async () => {
    const fetchMock = mockWikipedia();
    await renderApp(DAY);
    await findArticleLink('Empire State Building');

    expect(summaryUrls(fetchMock)).toHaveLength(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a dialog named after the article and requests its summary', async () => {
    const fetchMock = mockWikipedia({ json: rawSummary('Empire State Building') });
    const { user } = await renderApp(DAY);

    await user.click(await findArticleLink('Empire State Building'));

    expect(await findDialog('Empire State Building')).toBeVisible();
    expect(summaryUrls(fetchMock)).toEqual([
      'https://en.wikipedia.org/api/rest_v1/page/summary/Empire_State_Building',
    ]);
  });

  it('shows a loading state, already named, until the summary arrives', async () => {
    // No summary route: the request stays pending.
    mockFetch({ [FEED]: { json: rawFeed() } });
    const { user } = await renderApp(DAY);

    await user.click(await findArticleLink('Empire State Building'));

    const dialog = await findDialog('Empire State Building');
    expect(within(dialog).getByRole('status', { name: 'Loading summary' })).toBeInTheDocument();
  });

  it('shows the description, the text and a picture', async () => {
    mockWikipedia();
    const { user } = await renderApp(DAY);
    await user.click(await within(screen.getByRole('main')).findByRole('tab', { name: /Deaths/ }));

    await user.click(await findArticleLink('Ayrton Senna'));
    const dialog = await findDialog('Ayrton Senna');

    expect(await within(dialog).findByText(/da Silva was a Brazilian racing driver/)).toBeVisible();
    expect(within(dialog).getByText('Brazilian racing driver (1960–1994)')).toBeVisible();
    expect(dialog.querySelector('img')).toHaveAttribute(
      'src',
      'https://upload.wikimedia.org/thumb/330px-Ayrton_Senna.jpg',
    );
  });

  it('uses the title Wikipedia gives, which can differ after a redirect', async () => {
    mockWikipedia({ json: rawSummary('Empire State Building (New York)') });
    const { user } = await renderApp(DAY);

    await user.click(await findArticleLink('Empire State Building'));

    expect(await findDialog('Empire State Building (New York)')).toBeVisible();
  });

  it('links to the full article in a new tab', async () => {
    mockWikipedia();
    const { user } = await renderApp(DAY);

    await user.click(await findArticleLink('Empire State Building'));
    const link = await within(await findDialog('Ayrton Senna')).findByRole('link', {
      name: /Read on Wikipedia/,
    });

    expect(link).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Ayrton_Senna');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('lets keyboard users reach the text, so a long summary can be scrolled', async () => {
    mockWikipedia();
    await renderApp(`${DAY}?article=Ayrton_Senna`);
    const dialog = await findDialog('Ayrton Senna');

    const text = within(dialog).getByRole('region', { name: 'Summary' });
    expect(text).toHaveAttribute('tabindex', '0');
    expect(await within(text).findByText(/da Silva was a Brazilian racing driver/)).toBeVisible();
  });

  it('credits Wikipedia for the text', async () => {
    mockWikipedia();
    const { user } = await renderApp(DAY);

    await user.click(await findArticleLink('Empire State Building'));

    expect(
      await within(await findDialog('Ayrton Senna')).findByText(/Text from Wikipedia/),
    ).toBeVisible();
  });

  it('fetches an article once, however often it is opened', async () => {
    const fetchMock = mockWikipedia({ json: rawSummary('Empire State Building') });
    const { user } = await renderApp(DAY);

    await user.click(await findArticleLink('Empire State Building'));
    await user.click(
      within(await findDialog('Empire State Building')).getByRole('button', { name: 'Close' }),
    );
    await expectNoDialog();
    await user.click(await findArticleLink('Empire State Building'));
    await findDialog('Empire State Building');

    expect(summaryUrls(fetchMock)).toHaveLength(1);
  });
});

describe('the address', () => {
  it('names the open article, so the link can be shared', async () => {
    mockWikipedia();
    const { router, user } = await renderApp(DAY);

    await user.click(await findArticleLink('Empire State Building'));
    await screen.findByRole('dialog');

    expect(router.state.location.pathname).toBe(DAY);
    expect(router.state.location.search).toBe('?article=Empire_State_Building');
  });

  it('opens the dialog straight from a shared link', async () => {
    const fetchMock = mockWikipedia();
    await renderApp(`${DAY}?article=Ayrton_Senna`);

    expect(await findDialog('Ayrton Senna')).toBeVisible();
    expect(summaryUrls(fetchMock)).toEqual([
      'https://en.wikipedia.org/api/rest_v1/page/summary/Ayrton_Senna',
    ]);
  });

  it('accepts a title written with spaces', async () => {
    const fetchMock = mockWikipedia();
    await renderApp(`${DAY}?article=Ayrton%20Senna`);
    await findDialog('Ayrton Senna');

    expect(summaryUrls(fetchMock)).toEqual([
      'https://en.wikipedia.org/api/rest_v1/page/summary/Ayrton_Senna',
    ]);
  });

  it('opens nothing for an empty article name', async () => {
    const fetchMock = mockWikipedia();
    await renderApp(`${DAY}?article=`);
    await findArticleLink('Empire State Building');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(summaryUrls(fetchMock)).toHaveLength(0);
  });
});

describe('closing', () => {
  it('closes with the Close button and clears the address', async () => {
    mockWikipedia();
    const { router, user } = await renderApp(DAY);
    await user.click(await findArticleLink('Empire State Building'));

    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Close' }),
    );

    await expectNoDialog();
    expect(router.state.location.pathname).toBe(DAY);
    expect(router.state.location.search).toBe('');
  });

  it('closes with Escape', async () => {
    mockWikipedia();
    const { user } = await renderApp(DAY);
    await user.click(await findArticleLink('Empire State Building'));
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    await expectNoDialog();
  });

  it('closes with the browser’s Back button', async () => {
    mockWikipedia();
    const { router, user } = await renderApp(DAY);
    await user.click(await findArticleLink('Empire State Building'));
    await screen.findByRole('dialog');

    await router.navigate(-1);

    await expectNoDialog();
    expect(router.state.location.search).toBe('');
  });

  it('steps back in history, so Back does not reopen a closed dialog', async () => {
    mockWikipedia();
    const { router, user } = await renderApp('/day/2024-04-30');
    await router.navigate(DAY);
    // Both days show the same test feed: wait for the new day before using its links.
    await screen.findByRole('heading', { level: 1, name: 'May 1, 2024' });
    await user.click(await findArticleLink('Empire State Building'));
    expect(router.state.location.pathname).toBe(DAY);

    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Close' }),
    );
    await expectNoDialog();
    await router.navigate(-1);

    await waitFor(() => expect(router.state.location.pathname).toBe('/day/2024-04-30'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays on the day when a shared link’s dialog is closed', async () => {
    mockWikipedia();
    const { router, user } = await renderApp(`${DAY}?article=Ayrton_Senna`);

    await user.click(
      within(await findDialog('Ayrton Senna')).getByRole('button', { name: 'Close' }),
    );

    await expectNoDialog();
    expect(router.state.location.pathname).toBe(DAY);
    expect(router.state.location.search).toBe('');
  });

  it('returns focus to the link that opened it', async () => {
    mockWikipedia();
    const { user } = await renderApp(DAY);
    await user.click(await findArticleLink('Empire State Building'));

    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Close' }),
    );
    await expectNoDialog();

    await waitFor(async () => expect(await findArticleLink('Empire State Building')).toHaveFocus());
  });
});

describe('when there is no summary to show', () => {
  it('says so for a name that covers several articles, and links to the list', async () => {
    mockWikipedia({ json: rawDisambiguation() });
    await renderApp(`${DAY}?article=Mercury`);
    const dialog = await findDialog('Mercury');

    expect(await within(dialog).findByText(/can mean several things/)).toBeVisible();
    expect(within(dialog).queryByText(/most commonly refers to/)).not.toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /Read on Wikipedia/ })).toHaveAttribute(
      'href',
      'https://en.wikipedia.org/wiki/Mercury',
    );
  });

  it('says so when the article has no text', async () => {
    mockWikipedia({ json: rawSummary('Ayrton Senna', { extract: '' }) });
    await renderApp(`${DAY}?article=Ayrton_Senna`);

    expect(
      await within(await findDialog('Ayrton Senna')).findByText(/has no summary for this article/),
    ).toBeVisible();
  });

  it('says so, without retrying, when Wikipedia has no such article', async () => {
    const fetchMock = mockWikipedia({ status: 404 });
    await renderApp(`${DAY}?article=No_such_article`);
    const dialog = await findDialog('No such article');

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      /Wikipedia has no article with this name/,
    );
    expect(summaryUrls(fetchMock)).toHaveLength(1);
    expect(within(dialog).queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: /Wikipedia/ })).not.toBeInTheDocument();
  });

  it('retries a server error once, then offers Retry, which recovers', async () => {
    let reply: MockReply = { status: 503 };
    const fetchMock = mockWikipedia(() => reply);
    const { user } = await renderApp(`${DAY}?article=Ayrton_Senna`);
    const dialog = await findDialog('Ayrton Senna');

    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent(/having problems/i);
    expect(summaryUrls(fetchMock)).toHaveLength(2);
    // The article most likely exists, so the way to Wikipedia stays open.
    expect(within(dialog).getByRole('link', { name: /Read on Wikipedia/ })).toHaveAttribute(
      'href',
      'https://en.wikipedia.org/wiki/Ayrton_Senna',
    );

    reply = { json: rawSummary() };
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(await within(dialog).findByText(/da Silva was a Brazilian racing driver/)).toBeVisible();
  });

  it('shows an error, not a crash, for an unexpected response', async () => {
    mockWikipedia({ json: ['unexpected'] });
    await renderApp(`${DAY}?article=Ayrton_Senna`);

    expect(await within(await findDialog('Ayrton Senna')).findByRole('alert')).toHaveTextContent(
      /unexpected response/i,
    );
  });
});

describe('from the bookmarks page', () => {
  beforeEach(() => {
    seedBookmarks(sampleBookmarks());
  });

  const findSummaryLink = (name: string) =>
    within(screen.getByRole('list', { name: 'Saved bookmarks' })).findByRole('link', {
      name: `Summary of ${name}`,
    });

  it('opens the summary of a saved event’s article', async () => {
    const fetchMock = mockWikipedia();
    const { user } = await renderApp('/bookmarks');
    await screen.findByRole('list', { name: 'Saved bookmarks' });
    expect(summaryUrls(fetchMock)).toHaveLength(0);

    await user.click(await findSummaryLink('Ayrton Senna'));

    expect(await findDialog('Ayrton Senna')).toBeVisible();
    expect(summaryUrls(fetchMock)).toEqual([
      'https://en.wikipedia.org/api/rest_v1/page/summary/Ayrton_Senna',
    ]);
  });

  it('keeps the chosen filter while a summary is open and after it closes', async () => {
    mockWikipedia();
    const { router, user } = await renderApp('/bookmarks?type=death');
    await screen.findByRole('list', { name: 'Saved bookmarks' });

    await user.click(await findSummaryLink('Ayrton Senna'));
    const dialog = await findDialog('Ayrton Senna');
    expect(router.state.location.search).toBe('?type=death&article=Ayrton_Senna');

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await expectNoDialog();
    expect(router.state.location.search).toBe('?type=death');
  });

  it('has no summary for a saved picture, which links to NASA', async () => {
    mockWikipedia();
    await renderApp('/bookmarks');
    const list = await screen.findByRole('list', { name: 'Saved bookmarks' });

    expect(
      within(list).queryByRole('link', { name: 'Summary of A Hole in Mars' }),
    ).not.toBeInTheDocument();
    expect(within(list).getByRole('link', { name: 'A Hole in Mars on NASA APOD' })).toBeVisible();
  });
});
