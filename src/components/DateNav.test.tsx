import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { freezeTime } from '../test/clock';
import { renderApp } from '../test/renderApp';

const findPageHeading = (name: string) => screen.findByRole('heading', { level: 1, name });
const getNav = () => screen.getByRole('navigation', { name: 'Date navigation' });
const getSection = (name: 'Month' | 'Day' | 'Year') => screen.getByRole('spinbutton', { name });
const getSectionOrder = () =>
  screen.getAllByRole('spinbutton').map((section) => section.getAttribute('aria-label'));

/** Makes every max-width media query match, as on a phone. jsdom has no matchMedia. */
function matchPhoneWidth() {
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
    matches: query.includes('max-width'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

beforeEach(() => {
  freezeTime(2026, 11, 10);
});

describe('previous and next day', () => {
  it('goes to the previous day', async () => {
    const { router, user } = await renderApp('/day/2024-05-01');

    await user.click(await screen.findByRole('link', { name: 'Previous day' }));

    expect(await findPageHeading('April 30, 2024')).toBeVisible();
    expect(router.state.location.pathname).toBe('/day/2024-04-30');
  });

  it('goes to the next day', async () => {
    const { router, user } = await renderApp('/day/2024-05-01');

    await user.click(await screen.findByRole('link', { name: 'Next day' }));

    expect(await findPageHeading('May 2, 2024')).toBeVisible();
    expect(router.state.location.pathname).toBe('/day/2024-05-02');
  });

  it('adds history entries, so Back returns to the day before the click', async () => {
    const { router, user } = await renderApp('/day/2024-05-01');

    await user.click(await screen.findByRole('link', { name: 'Next day' }));
    await findPageHeading('May 2, 2024');
    await router.navigate(-1);

    expect(await findPageHeading('May 1, 2024')).toBeVisible();
  });

  it('disables Previous on the first allowed date', async () => {
    await renderApp('/day/1940-01-01');
    await findPageHeading('January 1, 1940');

    expect(within(getNav()).getByRole('button', { name: 'Previous day' })).toBeDisabled();
    expect(within(getNav()).queryByRole('link', { name: 'Previous day' })).not.toBeInTheDocument();
    expect(within(getNav()).getByRole('link', { name: 'Next day' })).toBeVisible();
  });

  it('disables Next on the last allowed date', async () => {
    await renderApp('/day/2026-11-24');
    await findPageHeading('November 24, 2026');

    expect(within(getNav()).getByRole('button', { name: 'Next day' })).toBeDisabled();
    expect(within(getNav()).queryByRole('link', { name: 'Next day' })).not.toBeInTheDocument();
    expect(within(getNav()).getByRole('link', { name: 'Previous day' })).toBeVisible();
  });
});

describe('today', () => {
  it('is a labelled text button on wide screens', async () => {
    await renderApp('/day/2024-05-01');
    await findPageHeading('May 1, 2024');

    expect(within(getNav()).getByRole('link', { name: 'Today' })).toHaveTextContent('Today');
  });

  it('shrinks to an icon on phone-width screens, keeping its accessible name', async () => {
    matchPhoneWidth();
    const { router, user } = await renderApp('/day/2024-05-01');
    await findPageHeading('May 1, 2024');

    const today = within(getNav()).getByRole('link', { name: 'Today' });
    expect(today).not.toHaveTextContent('Today');

    await user.click(today);

    expect(await findPageHeading('November 10, 2026')).toBeVisible();
    expect(router.state.location.pathname).toBe('/day/2026-11-10');
  });

  it('stays disabled as an icon on phone-width screens when already on today', async () => {
    matchPhoneWidth();
    await renderApp('/day/2026-11-10');
    await findPageHeading('November 10, 2026');

    expect(within(getNav()).getByRole('button', { name: 'Today' })).toBeDisabled();
  });

  it('jumps back to today from another date', async () => {
    const { router, user } = await renderApp('/day/2024-05-01');

    await findPageHeading('May 1, 2024');

    await user.click(within(getNav()).getByRole('link', { name: 'Today' }));

    expect(await findPageHeading('November 10, 2026')).toBeVisible();
    expect(router.state.location.pathname).toBe('/day/2026-11-10');
  });

  it('is disabled when already on today', async () => {
    await renderApp('/day/2026-11-10');
    await findPageHeading('November 10, 2026');

    expect(within(getNav()).getByRole('button', { name: 'Today' })).toBeDisabled();
  });
});

describe('date picker', () => {
  it('shows the date from the URL', async () => {
    await renderApp('/day/2024-05-01');
    await findPageHeading('May 1, 2024');

    expect(getSection('Month')).toHaveTextContent('05');
    expect(getSection('Day')).toHaveTextContent('01');
    expect(getSection('Year')).toHaveTextContent('2024');
  });

  it('follows the URL when the day changes by other means', async () => {
    const { user } = await renderApp('/day/2024-05-01');

    await user.click(await screen.findByRole('link', { name: 'Next day' }));
    await findPageHeading('May 2, 2024');

    expect(getSection('Day')).toHaveTextContent('02');
  });

  it('navigates as soon as a day is picked in the calendar', async () => {
    const { router, user } = await renderApp('/day/2024-05-01');

    await user.click(await screen.findByRole('button', { name: /choose date/i }));
    await user.click(await screen.findByRole('gridcell', { name: '15' }));

    expect(await findPageHeading('May 15, 2024')).toBeVisible();
    expect(router.state.location.pathname).toBe('/day/2024-05-15');
  });

  it('does not offer days outside the allowed range in the calendar', async () => {
    const { user } = await renderApp('/day/2026-11-24');

    await user.click(await screen.findByRole('button', { name: /choose date/i }));

    expect(await screen.findByRole('gridcell', { name: '24' })).toBeEnabled();
    expect(screen.getByRole('gridcell', { name: '25' })).toBeDisabled();
  });

  it('waits for Enter before navigating to a typed date', async () => {
    const { router, user } = await renderApp('/day/2024-05-01');
    await findPageHeading('May 1, 2024');

    await user.click(getSection('Day'));
    await user.keyboard('25');

    // "2" alone is already a valid day; navigating on it would load a date nobody asked for.
    expect(router.state.location.pathname).toBe('/day/2024-05-01');

    await user.keyboard('{Enter}');

    expect(await findPageHeading('May 25, 2024')).toBeVisible();
    expect(router.state.location.pathname).toBe('/day/2024-05-25');
  });

  it('navigates to a typed date when focus leaves the field', async () => {
    const { router, user } = await renderApp('/day/2024-05-01');
    await findPageHeading('May 1, 2024');

    await user.click(getSection('Day'));
    await user.keyboard('25');
    await user.click(screen.getByRole('heading', { level: 1 }));

    expect(await findPageHeading('May 25, 2024')).toBeVisible();
    expect(router.state.location.pathname).toBe('/day/2024-05-25');
  });

  it('ignores a typed date outside the allowed range and restores the field on blur', async () => {
    const { router, user } = await renderApp('/day/2024-05-01');
    await findPageHeading('May 1, 2024');

    await user.click(getSection('Year'));
    await user.keyboard('1900{Enter}');

    expect(getSection('Year')).toHaveTextContent('1900');
    expect(router.state.location.pathname).toBe('/day/2024-05-01');

    await user.click(screen.getByRole('heading', { level: 1 }));

    await waitFor(() => expect(getSection('Year')).toHaveTextContent('2024'));
    expect(router.state.location.pathname).toBe('/day/2024-05-01');
  });
});

describe('date picker locale', () => {
  it('uses month-first order for US English', async () => {
    await renderApp('/day/2024-05-01');
    await findPageHeading('May 1, 2024');

    expect(getSectionOrder()).toEqual(['Month', 'Day', 'Year']);
  });

  it('uses day-first order for a Spanish browser from the very first render', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-ES');
    await renderApp('/day/2024-05-01');

    // Checked synchronously: no US-order field may flash before the locale arrives.
    expect(getSectionOrder()).toEqual(['Day', 'Month', 'Year']);
    expect(await findPageHeading('1 de mayo de 2024')).toBeVisible();
  });

  it('falls back to US English order for an unsupported language', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('tlh');
    await renderApp('/day/2024-05-01');
    await screen.findByRole('heading', { level: 1 });

    expect(getSectionOrder()).toEqual(['Month', 'Day', 'Year']);
  });
});
