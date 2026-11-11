import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { freezeTime } from '../../test/clock';
import { mockFetch, type MockReply, requestedUrls } from '../../test/mockFetch';
import { renderApp } from '../../test/renderApp';
import { rawWeather, rawWeatherImperial } from './fixtures';

const OPEN_METEO = 'open-meteo.com';

const getCard = () => screen.getByRole('region', { name: 'Weather' });
const findCard = () => screen.findByRole('region', { name: 'Weather' });
const weatherUrls = (fetchMock: ReturnType<typeof mockFetch>) =>
  requestedUrls(fetchMock)
    .filter((url) => url.includes(OPEN_METEO))
    .map((url) => new URL(url));

/** The value shown next to a label in the card's stats list. */
function getStat(label: string) {
  const term = within(getCard()).getByText(label, { selector: 'dt' });
  return term.nextElementSibling;
}

/** Waits until the day's high reads `text` (e.g. "24°"). */
const expectHigh = (text: string) => waitFor(() => expect(getStat('High')).toHaveTextContent(text));

beforeEach(() => {
  freezeTime(2026, 11, 10);
});

describe('what is requested', () => {
  it('asks the archive about Fene for a past date', async () => {
    const fetchMock = mockFetch({ [OPEN_METEO]: { json: rawWeather() } });
    await renderApp('/day/1969-07-20');
    await within(await findCard()).findByText('Partly cloudy');

    const [url] = weatherUrls(fetchMock);
    expect(url?.hostname).toBe('archive-api.open-meteo.com');
    expect(url?.searchParams.get('latitude')).toBe('43.45');
    expect(url?.searchParams.get('start_date')).toBe('1969-07-20');
  });

  it('asks the forecast for a coming date', async () => {
    const fetchMock = mockFetch({ [OPEN_METEO]: { json: rawWeather() } });
    await renderApp('/day/2026-11-20');
    await within(await findCard()).findByText('Partly cloudy');

    expect(weatherUrls(fetchMock)[0]?.hostname).toBe('api.open-meteo.com');
  });

  it('shows a loading state until the weather arrives', async () => {
    mockFetch({});
    await renderApp('/day/1969-07-20');

    expect(
      await within(await findCard()).findByRole('status', { name: 'Loading Weather' }),
    ).toBeInTheDocument();
  });
});

describe('what is shown', () => {
  beforeEach(() => {
    // en-GB: metric by default, 24-hour clock.
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-GB');
    mockFetch({ [OPEN_METEO]: { json: rawWeather() } });
  });

  it('names the place', async () => {
    await renderApp('/day/1969-07-20');

    expect(await within(await findCard()).findByRole('combobox', { name: 'Location' })).toHaveValue(
      'Fene, Galicia, Spain',
    );
  });

  it('describes the conditions and the day’s high and low', async () => {
    await renderApp('/day/1969-07-20');
    const card = await findCard();

    expect(await within(card).findByText('Partly cloudy')).toBeVisible();
    expect(getStat('High')).toHaveTextContent('24°');
    expect(getStat('Low')).toHaveTextContent('16°');
  });

  it('lists precipitation, wind and daylight in the chosen units', async () => {
    await renderApp('/day/1969-07-20');
    await within(await findCard()).findByText('Partly cloudy');

    expect(getStat('Precipitation')).toHaveTextContent('0 mm');
    expect(getStat('Wind')).toHaveTextContent('25 km/h');
    expect(getStat('Sunrise')).toHaveTextContent('06:09');
    expect(getStat('Sunset')).toHaveTextContent('21:07');
    expect(getStat('Daylight')).toHaveTextContent('14 h 58 min');
  });

  it('labels a past day as historical', async () => {
    await renderApp('/day/1969-07-20');

    expect(await within(await findCard()).findByText('Historical')).toBeVisible();
  });

  it.each([
    ['today', '2026-11-10'],
    ['a coming day', '2026-11-20'],
  ])('labels %s as a forecast', async (_label, date) => {
    await renderApp(`/day/${date}`);

    expect(await within(await findCard()).findByText('Forecast')).toBeVisible();
  });

  it('leaves out a value the source does not have', async () => {
    mockFetch({ [OPEN_METEO]: { json: rawWeather({ wind_speed_10m_max: [null] }) } });
    await renderApp('/day/1969-07-20');
    await within(await findCard()).findByText('Partly cloudy');

    expect(within(getCard()).queryByText('Wind', { selector: 'dt' })).not.toBeInTheDocument();
    expect(getStat('Precipitation')).toHaveTextContent('0 mm');
  });
});

describe('temperature units', () => {
  const routes = () => ({
    [OPEN_METEO]: (): MockReply => ({ json: rawWeather() }),
    fahrenheit: (): MockReply => ({ json: rawWeatherImperial() }),
  });

  /** Imperial requests carry "fahrenheit"; the first matching route wins, so check it first. */
  function mockWeather() {
    const { fahrenheit, [OPEN_METEO]: metric } = routes();
    return mockFetch({ fahrenheit, [OPEN_METEO]: metric });
  }

  it('defaults to Fahrenheit for a US browser', async () => {
    mockWeather();
    await renderApp('/day/1969-07-20');
    const card = await findCard();

    await expectHigh('75°');
    expect(within(card).getByRole('button', { name: /^°F/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(getStat('Wind')).toHaveTextContent('16 mph');
    expect(getStat('Sunrise')).toHaveTextContent('6:09 AM');
  });

  it('defaults to Celsius elsewhere', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-ES');
    mockWeather();
    await renderApp('/day/1969-07-20');
    const card = await findCard();

    await expectHigh('24°');
    expect(within(card).getByRole('button', { name: /^°C/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('switches units by asking the API again, and remembers the choice', async () => {
    const fetchMock = mockWeather();
    const { user } = await renderApp('/day/1969-07-20');
    const card = await findCard();
    await expectHigh('75°');

    await user.click(within(card).getByRole('button', { name: /^°C/ }));

    await expectHigh('24°');
    expect(weatherUrls(fetchMock).at(-1)?.searchParams.has('temperature_unit')).toBe(false);
    expect(localStorage.getItem('almanac.units.v1')).toBe('"metric"');
  });

  it('uses the remembered choice on the next visit', async () => {
    localStorage.setItem('almanac.units.v1', '"metric"');
    mockWeather();
    await renderApp('/day/1969-07-20');

    await findCard();
    await expectHigh('24°');
  });

  it('keeps the selection when the selected unit is clicked again', async () => {
    mockWeather();
    const { user } = await renderApp('/day/1969-07-20');
    const card = await findCard();
    await expectHigh('75°');

    await user.click(within(card).getByRole('button', { name: /^°F/ }));

    expect(within(card).getByRole('button', { name: /^°F/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('does not fetch a unit again after switching back', async () => {
    const fetchMock = mockWeather();
    const { user } = await renderApp('/day/1969-07-20');
    const card = await findCard();
    await expectHigh('75°');

    await user.click(within(card).getByRole('button', { name: /^°C/ }));
    await expectHigh('24°');
    await user.click(within(getCard()).getByRole('button', { name: /^°F/ }));
    await expectHigh('75°');

    expect(weatherUrls(fetchMock)).toHaveLength(2);
  });
});

describe('empty and error states', () => {
  it('says so when the source has no data for the day', async () => {
    mockFetch({
      [OPEN_METEO]: {
        json: rawWeather({ weather_code: [null], temperature_2m_max: [null] }),
      },
    });
    await renderApp('/day/1969-07-20');

    expect(
      await within(await findCard()).findByText('No weather data for this date.'),
    ).toBeVisible();
  });

  it('shows an error with Retry, and recovers', async () => {
    let reply: MockReply = { status: 400 };
    mockFetch({ [OPEN_METEO]: () => reply });
    const { user } = await renderApp('/day/1969-07-20');

    const alert = await within(await findCard()).findByRole('alert');
    reply = { json: rawWeather() };
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(await within(getCard()).findByText('Partly cloudy')).toBeVisible();
  });

  it('fails on its own without affecting On This Day', async () => {
    mockFetch({
      [OPEN_METEO]: { status: 500 },
      'feed/onthisday': { json: { events: [{ year: 1969, text: 'Moon landing.', pages: [] }] } },
    });
    await renderApp('/day/1969-07-20');

    await within(await findCard()).findByRole('alert');
    const history = screen.getByRole('region', { name: 'On This Day' });
    await waitFor(() => expect(within(history).getByText('Moon landing.')).toBeVisible());
  });
});
