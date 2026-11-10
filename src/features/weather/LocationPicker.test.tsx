import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { freezeTime } from '../../test/clock';
import { mockFetch, requestedUrls } from '../../test/mockFetch';
import { renderApp } from '../../test/renderApp';
import { rawGeocoding, rawWeather } from './fixtures';

const GEOCODING = 'geocoding-api.open-meteo.com';
const STORAGE_KEY = 'almanac.location.v1';

const PARIS = {
  id: 'geo-2988507',
  name: 'Paris',
  region: 'Île-de-France Region',
  country: 'France',
  latitude: 48.85341,
  longitude: 2.3488,
};

/** Weather answers for any place; geocoding is listed first because its host also matches. */
function mockApis(geocoding: Parameters<typeof mockFetch>[0][string] = { json: rawGeocoding() }) {
  return mockFetch({ [GEOCODING]: geocoding, 'open-meteo.com': { json: rawWeather() } });
}

const urlsFor = (fetchMock: ReturnType<typeof mockFetch>, host: 'geocoding' | 'weather') =>
  requestedUrls(fetchMock)
    .map((url) => new URL(url))
    .filter((url) => url.hostname.endsWith('open-meteo.com'))
    .filter((url) => (url.hostname === GEOCODING) === (host === 'geocoding'));

const findPicker = () => screen.findByRole('combobox', { name: 'Location' });
const getOptions = () => within(screen.getByRole('listbox')).getAllByRole('option');
const optionNames = () => getOptions().map((option) => option.textContent);

beforeEach(() => {
  freezeTime(2026, 11, 10);
});

describe('current location', () => {
  it('shows Fene by default', async () => {
    mockApis();
    await renderApp('/day/1969-07-20');

    expect(await findPicker()).toHaveValue('Fene, Galicia, Spain');
  });

  it('uses the remembered place on the next visit', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(PARIS));
    const fetchMock = mockApis();
    await renderApp('/day/1969-07-20');

    expect(await findPicker()).toHaveValue('Paris, Île-de-France Region, France');
    await waitFor(() =>
      expect(urlsFor(fetchMock, 'weather')[0]?.searchParams.get('latitude')).toBe('48.85341'),
    );
  });

  it.each([
    ['broken JSON', '{"name": "Par'],
    ['an incomplete place', '{"name": "Atlantis"}'],
  ])('falls back to Fene when the remembered place is %s', async (_label, stored) => {
    localStorage.setItem(STORAGE_KEY, stored);
    mockApis();
    await renderApp('/day/1969-07-20');

    expect(await findPicker()).toHaveValue('Fene, Galicia, Spain');
  });
});

describe('suggested places', () => {
  it('offers Fene, Zolochiv and Cody when opened', async () => {
    mockApis();
    const { user } = await renderApp('/day/1969-07-20');

    await user.click(await findPicker());

    expect(optionNames()).toEqual([
      'Fene, Galicia, Spain',
      'Zolochiv, Lviv Oblast, Ukraine',
      'Cody, Wyoming, United States',
    ]);
  });

  it('loads the weather for a chosen place and remembers it', async () => {
    const fetchMock = mockApis();
    const { user } = await renderApp('/day/1969-07-20');

    await user.click(await findPicker());
    await user.click(screen.getByRole('option', { name: 'Cody, Wyoming, United States' }));

    expect(await findPicker()).toHaveValue('Cody, Wyoming, United States');
    await waitFor(() =>
      expect(urlsFor(fetchMock, 'weather').at(-1)?.searchParams.get('latitude')).toBe('44.52634'),
    );
    expect(urlsFor(fetchMock, 'weather').at(-1)?.searchParams.get('longitude')).toBe('-109.05653');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toMatchObject({
      id: 'cody-us',
      name: 'Cody',
    });
  });

  it('lists a searched place you are on ahead of the suggestions', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(PARIS));
    mockApis();
    const { user } = await renderApp('/day/1969-07-20');

    await user.click(await findPicker());

    expect(optionNames()).toEqual([
      'Paris, Île-de-France Region, France',
      'Fene, Galicia, Spain',
      'Zolochiv, Lviv Oblast, Ukraine',
      'Cody, Wyoming, United States',
    ]);
  });
});

describe('searching for a place', () => {
  it('finds places by name and loads the weather for the chosen one', async () => {
    const fetchMock = mockApis();
    const { user } = await renderApp('/day/1969-07-20');
    const picker = await findPicker();

    await user.clear(picker);
    await user.type(picker, 'Paris');
    await user.click(
      await screen.findByRole('option', { name: 'Paris, Île-de-France Region, France' }),
    );

    expect(picker).toHaveValue('Paris, Île-de-France Region, France');
    expect(urlsFor(fetchMock, 'geocoding')[0]?.searchParams.get('name')).toBe('Paris');
    await waitFor(() =>
      expect(urlsFor(fetchMock, 'weather').at(-1)?.searchParams.get('latitude')).toBe('48.85341'),
    );
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual(PARIS);
  });

  it('tells apart places that share a name', async () => {
    mockApis();
    const { user } = await renderApp('/day/1969-07-20');
    const picker = await findPicker();

    await user.clear(picker);
    await user.type(picker, 'Paris');
    await screen.findByRole('option', { name: 'Paris, Île-de-France Region, France' });

    expect(optionNames()).toEqual([
      'Paris, Île-de-France Region, France',
      'Paris, Texas, United States',
    ]);
  });

  it('waits for a pause in typing, sending one request for a word', async () => {
    const fetchMock = mockApis();
    const { user } = await renderApp('/day/1969-07-20');
    const picker = await findPicker();

    await user.clear(picker);
    await user.type(picker, 'Paris');
    await screen.findByRole('option', { name: 'Paris, Île-de-France Region, France' });

    expect(urlsFor(fetchMock, 'geocoding').map((url) => url.searchParams.get('name'))).toEqual([
      'Paris',
    ]);
  });

  it('does not search for a single letter', async () => {
    const fetchMock = mockApis();
    const { user } = await renderApp('/day/1969-07-20');
    const picker = await findPicker();

    await user.clear(picker);
    await user.type(picker, 'P');
    // Longer than the typing pause.
    await new Promise((resolve) => setTimeout(resolve, 450));

    expect(urlsFor(fetchMock, 'geocoding')).toHaveLength(0);
  });

  it('says so when nothing matches', async () => {
    mockApis({ json: { generationtime_ms: 0.06 } });
    const { user } = await renderApp('/day/1969-07-20');
    const picker = await findPicker();

    await user.clear(picker);
    await user.type(picker, 'Zzzqq');

    expect(await screen.findByText('No places found')).toBeVisible();
  });

  it('says so when the search fails', async () => {
    mockApis({ status: 400 });
    const { user } = await renderApp('/day/1969-07-20');
    const picker = await findPicker();

    await user.clear(picker);
    await user.type(picker, 'Paris');

    expect(await screen.findByText('Search failed. Try again.')).toBeVisible();
  });

  it('keeps the current place when the search is abandoned', async () => {
    mockApis();
    const { user } = await renderApp('/day/1969-07-20');
    const picker = await findPicker();

    await user.clear(picker);
    await user.type(picker, 'Paris');
    await screen.findByRole('option', { name: 'Paris, Île-de-France Region, France' });
    await user.click(screen.getByRole('heading', { level: 1 }));

    expect(picker).toHaveValue('Fene, Galicia, Spain');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
