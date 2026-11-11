import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleBookmarks, seedBookmarks } from './features/bookmarks/fixtures';
import { freezeTime } from './test/clock';
import { mockAllSources } from './test/mockAllSources';
import { renderApp } from './test/renderApp';

/**
 * One switch, in the weather card, chooses between US conventions (°F, mph, month-first
 * dates, 12-hour clock) and the rest of the world's (°C, km/h, day-first dates, 24-hour
 * clock). Until it is used, everything follows the browser's language.
 */

const DAY = '/day/2024-05-01';
const UNITS_KEY = 'almanac.units.v1';

const getSwitch = () => screen.getByRole('group', { name: 'Units and date format' });
const getOption = (name: RegExp) => within(getSwitch()).getByRole('button', { name });
const getPageHeading = () => screen.getByRole('heading', { level: 1 });
/** The order of the date field's parts, e.g. Month, Day, Year. */
const getFieldOrder = () =>
  screen.getAllByRole('spinbutton').map((section) => section.getAttribute('aria-label'));
const getWeatherStat = (label: string) => {
  const term = within(screen.getByRole('region', { name: 'Weather' })).getByText(label);
  return term.nextElementSibling;
};
const waitForWeather = () =>
  within(screen.getByRole('region', { name: 'Weather' })).findByText('Sunrise');

beforeEach(() => {
  freezeTime(2026, 11, 10);
  mockAllSources();
});

describe('the switch', () => {
  it('shows only the temperature unit on each side', async () => {
    await renderApp(DAY);
    await waitForWeather();

    expect(getOption(/^°C$/)).toHaveTextContent(/^°C$/);
    expect(getOption(/^°F$/)).toHaveTextContent(/^°F$/);
  });

  it('starts on the side the browser’s region uses', async () => {
    await renderApp(DAY);
    await waitForWeather();

    expect(getOption(/^°F/)).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('a US browser, as it starts', () => {
  it('writes dates month first and times on a 12-hour clock', async () => {
    await renderApp(DAY);
    await waitForWeather();

    expect(getPageHeading()).toHaveAccessibleName('May 1, 2024');
    expect(document.title).toBe('May 1, 2024 · Almanac');
    expect(getFieldOrder()).toEqual(['Month', 'Day', 'Year']);
    expect(getWeatherStat('Sunrise')).toHaveTextContent('7:24 AM');
  });
});

describe('choosing °C on a US browser', () => {
  it('switches dates to day first and times to a 24-hour clock, everywhere', async () => {
    const { user } = await renderApp(DAY);
    await waitForWeather();

    await user.click(getOption(/^°C/));

    await waitFor(() => expect(getPageHeading()).toHaveAccessibleName('1 May 2024'));
    expect(document.title).toBe('1 May 2024 · Almanac');
    await waitFor(() => expect(getFieldOrder()).toEqual(['Day', 'Month', 'Year']));
    await waitFor(() => expect(getWeatherStat('Sunrise')).toHaveTextContent('07:24'));
    expect(getWeatherStat('Wind')).toHaveTextContent('km/h');
  });

  it('marks the date with the language it is now written in', async () => {
    const { user } = await renderApp(DAY);
    await waitForWeather();

    await user.click(getOption(/^°C/));

    await waitFor(() => expect(getPageHeading()).toHaveAttribute('lang', 'en-GB'));
  });

  it('switches back with °F', async () => {
    const { user } = await renderApp(DAY);
    await waitForWeather();

    await user.click(getOption(/^°C/));
    await waitFor(() => expect(getFieldOrder()).toEqual(['Day', 'Month', 'Year']));
    await user.click(getOption(/^°F/));

    await waitFor(() => expect(getPageHeading()).toHaveAccessibleName('May 1, 2024'));
    await waitFor(() => expect(getFieldOrder()).toEqual(['Month', 'Day', 'Year']));
  });

  it('keeps the date field working: the same day stays selected', async () => {
    const { router, user } = await renderApp(DAY);
    await waitForWeather();

    await user.click(getOption(/^°C/));
    await waitFor(() => expect(getFieldOrder()).toEqual(['Day', 'Month', 'Year']));

    expect(screen.getByRole('spinbutton', { name: 'Day' })).toHaveTextContent('01');
    expect(screen.getByRole('spinbutton', { name: 'Month' })).toHaveTextContent('05');
    expect(router.state.location.pathname).toBe(DAY);
  });
});

describe('a remembered choice', () => {
  it('applies from the first moment of the next visit', async () => {
    localStorage.setItem(UNITS_KEY, '"metric"');
    await renderApp(DAY);

    // No waiting for anything to switch: the page starts this way.
    expect(await screen.findByRole('heading', { level: 1, name: '1 May 2024' })).toBeVisible();
    expect(getFieldOrder()).toEqual(['Day', 'Month', 'Year']);
  });

  it('applies on the bookmarks page too', async () => {
    localStorage.setItem(UNITS_KEY, '"metric"');
    seedBookmarks(sampleBookmarks());
    await renderApp('/bookmarks');
    const list = await screen.findByRole('list', { name: 'Saved bookmarks' });

    expect(within(list).getAllByRole('link', { name: 'Open 1 May 2024' }).length).toBeGreaterThan(
      0,
    );
    // "Saved 10 Nov 2026", day first. Worked out here rather than written out, because the
    // saved moment falls on the 10th or the 11th depending on the reader's time zone.
    const savedOn = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(
      new Date(sampleBookmarks()[0]?.savedAt ?? ''),
    );
    expect(savedOn).toMatch(/^1[01] Nov 2026$/);
    expect(within(list).getAllByText(savedOn).length).toBeGreaterThan(0);
  });
});

describe('browsers from elsewhere', () => {
  it('a British browser starts on °C with day-first dates, and °F switches to US style', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-GB');
    const { user } = await renderApp(DAY);
    await waitForWeather();

    expect(getOption(/^°C/)).toHaveAttribute('aria-pressed', 'true');
    expect(getPageHeading()).toHaveAccessibleName('1 May 2024');

    await user.click(getOption(/^°F/));

    await waitFor(() => expect(getPageHeading()).toHaveAccessibleName('May 1, 2024'));
    await waitFor(() => expect(getFieldOrder()).toEqual(['Month', 'Day', 'Year']));
  });

  it('a Spanish browser keeps its own language until °F is chosen', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-ES');
    const { user } = await renderApp(DAY);
    await waitForWeather();

    expect(getPageHeading()).toHaveAccessibleName('1 de mayo de 2024');

    await user.click(getOption(/^°F/));
    await waitFor(() => expect(getPageHeading()).toHaveAccessibleName('May 1, 2024'));

    await user.click(getOption(/^°C/));
    await waitFor(() => expect(getPageHeading()).toHaveAccessibleName('1 de mayo de 2024'));
  });
});
