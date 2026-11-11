import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { freezeTime } from '../test/clock';
import { requestedUrls } from '../test/mockFetch';
import { mockAllSources, SOURCES } from '../test/mockAllSources';
import { renderApp } from '../test/renderApp';

/**
 * The day page as a whole: the three sources side by side, each on its own. The cards'
 * own behaviour is tested next to each card.
 */

const DAY = '/day/2024-05-01';

const findSection = (name: string) => screen.findByRole('region', { name });
const getSection = (name: string) => screen.getByRole('region', { name });

/** Waits until every section has finished loading (no loading placeholders left). */
const waitForSections = () =>
  waitFor(() => expect(screen.queryAllByRole('status', { name: /^Loading / })).toHaveLength(0));

beforeEach(() => {
  freezeTime(2026, 11, 10);
});

describe('a day with everything available', () => {
  it('shows the weather, the picture of the day and history for the date', async () => {
    mockAllSources();
    await renderApp(DAY);
    await waitForSections();

    expect(within(getSection('Weather')).getByText('Partly cloudy')).toBeVisible();
    expect(
      within(getSection('Astronomy Picture of the Day')).getByRole('heading', {
        name: 'A Hole in Mars',
      }),
    ).toBeVisible();
    expect(
      within(getSection('On This Day')).getByText(
        'The Empire State Building is dedicated in New York City.',
      ),
    ).toBeVisible();
  });

  it('asks each source once, for this date', async () => {
    const fetchMock = mockAllSources();
    await renderApp(DAY);
    await waitForSections();

    const urls = requestedUrls(fetchMock);
    const weather = urls.filter((url) => url.includes(SOURCES.weather));
    const apod = urls.filter((url) => url.includes(SOURCES.apod));
    const history = urls.filter((url) => url.includes(SOURCES.onThisDay));

    expect(weather).toHaveLength(1);
    expect(new URL(weather[0] ?? '').searchParams.get('start_date')).toBe('2024-05-01');
    expect(apod).toHaveLength(1);
    expect(new URL(apod[0] ?? '').searchParams.get('date')).toBe('2024-05-01');
    expect(history).toEqual(['https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/05/01']);
    // Nothing else: no summary until one is opened, no fallback while the API answers.
    expect(urls).toHaveLength(3);
  });

  it('outlines the page with one main heading and a heading per section', async () => {
    mockAllSources();
    await renderApp(DAY);
    await waitForSections();

    const main = screen.getByRole('main');
    expect(
      within(main)
        .getAllByRole('heading', { level: 1 })
        .map((h) => h.textContent),
    ).toEqual(['Wednesday1May 2024']);
    expect(within(main).getByRole('heading', { level: 1 })).toHaveAccessibleName('May 1, 2024');
    expect(
      within(main)
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(['Weather', 'Astronomy Picture of the Day', 'On This Day']);
  });
});

describe('when a source fails', () => {
  it.each([
    ['Weather', { weather: { status: 503 } }],
    ['Astronomy Picture of the Day', { apod: { status: 503 }, nasaScience: { status: 503 } }],
    ['On This Day', { onThisDay: { status: 503 } }],
  ] as const)('shows the error only in %s, and the rest as usual', async (failing, replies) => {
    mockAllSources(replies);
    await renderApp(DAY);
    await waitForSections();

    const sections = ['Weather', 'Astronomy Picture of the Day', 'On This Day'];
    for (const name of sections) {
      const alert = within(getSection(name)).queryByRole('alert');
      if (name === failing) expect(alert).toHaveTextContent(/having problems/i);
      else expect(alert).not.toBeInTheDocument();
    }
  });

  it('keeps the page usable when every source fails', async () => {
    mockAllSources({
      weather: { error: new TypeError('offline') },
      apod: { error: new TypeError('offline') },
      onThisDay: { error: new TypeError('offline') },
    });
    const { user } = await renderApp(DAY);
    await waitForSections();

    expect(screen.getAllByRole('alert')).toHaveLength(3);

    await user.click(screen.getByRole('link', { name: 'Previous day' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'April 30, 2024' })).toBeVisible();
  });
});

describe('moving to another day', () => {
  it('loads every section again for the new date', async () => {
    const fetchMock = mockAllSources();
    const { user } = await renderApp(DAY);
    await waitForSections();

    await user.click(screen.getByRole('link', { name: 'Next day' }));
    await screen.findByRole('heading', { level: 1, name: 'May 2, 2024' });
    await findSection('On This Day');

    await waitFor(() => {
      const urls = requestedUrls(fetchMock);
      expect(urls).toContain('https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/05/02');
      expect(
        urls.some((url) => url.includes(SOURCES.apod) && url.includes('date=2024-05-02')),
      ).toBe(true);
      expect(
        urls.some((url) => url.includes(SOURCES.weather) && url.includes('start_date=2024-05-02')),
      ).toBe(true);
    });
  });
});
