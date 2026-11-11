import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { COLOR_MODE_STORAGE_KEY, COLOR_SCHEME_ATTRIBUTE } from '../lib/colorMode';
import { renderApp } from '../test/renderApp';
import { mockSystemColorScheme } from '../test/systemColorScheme';

/** A page that needs no network. */
const PAGE = '/bookmarks';

/** The scheme the page is drawn in: the attribute the theme's colors hang on. */
const shownScheme = () => document.documentElement.getAttribute(COLOR_SCHEME_ATTRIBUTE);
const storedMode = () => localStorage.getItem(COLOR_MODE_STORAGE_KEY);
const findToggle = (name: string) =>
  within(screen.getByRole('banner')).findByRole('button', { name });

describe('following the system', () => {
  it('shows the light scheme when the system is light', async () => {
    mockSystemColorScheme('light');
    await renderApp(PAGE);

    expect(await findToggle('Switch to dark mode')).toBeVisible();
    expect(shownScheme()).toBe('light');
  });

  it('shows the dark scheme when the system is dark', async () => {
    mockSystemColorScheme('dark');
    await renderApp(PAGE);

    expect(await findToggle('Switch to light mode')).toBeVisible();
    expect(shownScheme()).toBe('dark');
  });

  it('changes with the system, e.g. at sunset', async () => {
    const system = mockSystemColorScheme('light');
    await renderApp(PAGE);
    await findToggle('Switch to dark mode');

    system.set('dark');

    expect(await findToggle('Switch to light mode')).toBeVisible();
    expect(shownScheme()).toBe('dark');
  });

  it('stores nothing until a choice is made', async () => {
    mockSystemColorScheme('dark');
    await renderApp(PAGE);
    await findToggle('Switch to light mode');

    expect(storedMode()).toBeNull();
  });

  it('stays light where the system preference cannot be read', async () => {
    await renderApp(PAGE);

    expect(await findToggle('Switch to dark mode')).toBeVisible();
    expect(shownScheme()).not.toBe('dark');
  });
});

describe('choosing a mode', () => {
  it('switches to dark and back to light', async () => {
    mockSystemColorScheme('light');
    const { user } = await renderApp(PAGE);

    await user.click(await findToggle('Switch to dark mode'));
    expect(shownScheme()).toBe('dark');

    await user.click(await findToggle('Switch to light mode'));
    expect(shownScheme()).toBe('light');
    expect(await findToggle('Switch to dark mode')).toBeVisible();
  });

  it('remembers the choice for the next visit', async () => {
    mockSystemColorScheme('light');
    const { user } = await renderApp(PAGE);
    await user.click(await findToggle('Switch to dark mode'));
    expect(storedMode()).toBe('dark');

    // A new visit: the app starts again with what the browser kept.
    cleanup();
    document.documentElement.removeAttribute(COLOR_SCHEME_ATTRIBUTE);
    await renderApp(PAGE);

    expect(await findToggle('Switch to light mode')).toBeVisible();
    expect(shownScheme()).toBe('dark');
  });

  it('applies a stored choice over the system preference', async () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'light');
    mockSystemColorScheme('dark');
    await renderApp(PAGE);

    expect(await findToggle('Switch to dark mode')).toBeVisible();
    expect(shownScheme()).toBe('light');
  });

  it('keeps the choice when the system changes', async () => {
    const system = mockSystemColorScheme('light');
    const { user } = await renderApp(PAGE);
    await user.click(await findToggle('Switch to dark mode'));

    system.set('dark');
    system.set('light');

    expect(shownScheme()).toBe('dark');
    expect(await findToggle('Switch to light mode')).toBeVisible();
  });

  it('follows the system again once the choice matches it', async () => {
    const system = mockSystemColorScheme('light');
    const { user } = await renderApp(PAGE);
    await user.click(await findToggle('Switch to dark mode'));

    // Back to light, which is what the system uses: no override is left.
    await user.click(await findToggle('Switch to light mode'));
    expect(storedMode()).toBe('system');

    system.set('dark');
    await waitFor(() => expect(shownScheme()).toBe('dark'));
  });

  it('follows a choice made in another tab', async () => {
    mockSystemColorScheme('light');
    await renderApp(PAGE);
    await findToggle('Switch to dark mode');

    // The other tab writes the choice; this one hears about it through a storage event.
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'dark');
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: COLOR_MODE_STORAGE_KEY, newValue: 'dark' }),
      );
    });

    expect(await findToggle('Switch to light mode')).toBeVisible();
    expect(shownScheme()).toBe('dark');
  });

  it('follows the system when the stored value is not a mode', async () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'purple');
    mockSystemColorScheme('dark');
    await renderApp(PAGE);

    expect(await findToggle('Switch to light mode')).toBeVisible();
    expect(shownScheme()).toBe('dark');
  });
});

describe('the button', () => {
  it('says what it does in a tooltip too', async () => {
    mockSystemColorScheme('light');
    const { user } = await renderApp(PAGE);

    await user.hover(await findToggle('Switch to dark mode'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Switch to dark mode');
  });

  it('is on every page', async () => {
    mockSystemColorScheme('light');
    await renderApp('/day/2024-05-01');

    expect(await findToggle('Switch to dark mode')).toBeVisible();
  });
});
