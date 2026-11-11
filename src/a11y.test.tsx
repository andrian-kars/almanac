import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { sampleBookmarks, seedBookmarks } from './features/bookmarks/fixtures';
import { findA11yViolations } from './test/axe';
import { freezeTime } from './test/clock';
import { mockAllSources } from './test/mockAllSources';
import { renderApp } from './test/renderApp';
import { mockSystemColorScheme } from './test/systemColorScheme';

/**
 * Every page, run through the axe accessibility checker in the states people see: loaded,
 * empty, failed, and with the summary dialog open. A test fails with a readable list of
 * what is wrong and where.
 */

const DAY = '/day/2024-05-01';

const waitForSections = () =>
  waitFor(() => expect(screen.queryAllByRole('status', { name: /^Loading / })).toHaveLength(0));

beforeEach(() => {
  freezeTime(2026, 11, 10);
});

describe('accessibility', () => {
  it.each(['light', 'dark'] as const)('the day page, loaded, in %s mode', async (scheme) => {
    mockSystemColorScheme(scheme);
    mockAllSources();
    await renderApp(DAY);
    await waitForSections();

    expect(await findA11yViolations()).toEqual([]);
  });

  it('the day page while loading', async () => {
    // No mocked sources: every request stays pending.
    await renderApp(DAY);
    await screen.findAllByRole('status', { name: /^Loading / });

    expect(await findA11yViolations()).toEqual([]);
  });

  it('the day page when every source fails', async () => {
    mockAllSources({
      weather: { status: 503 },
      apod: { status: 503 },
      nasaScience: { status: 503 },
      onThisDay: { status: 503 },
    });
    await renderApp(DAY);
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(3));

    expect(await findA11yViolations()).toEqual([]);
  });

  it('the summary dialog', async () => {
    mockAllSources();
    await renderApp(`${DAY}?article=Empire_State_Building`);
    const dialog = await screen.findByRole('dialog', { name: 'Empire State Building' });
    await within(dialog).findByText(/Empire State Building da Silva/);

    expect(await findA11yViolations()).toEqual([]);
  });

  it('the bookmarks page with bookmarks', async () => {
    seedBookmarks(sampleBookmarks());
    await renderApp('/bookmarks');
    await screen.findByRole('list', { name: 'Saved bookmarks' });

    expect(await findA11yViolations()).toEqual([]);
  });

  it('the bookmarks page with none', async () => {
    await renderApp('/bookmarks');
    await screen.findByText('No bookmarks yet');

    expect(await findA11yViolations()).toEqual([]);
  });

  it('the bookmarks page after a removal, with the Undo notice', async () => {
    seedBookmarks(sampleBookmarks());
    const { user } = await renderApp('/bookmarks');
    await user.click(await screen.findByRole('button', { name: 'Remove bookmark: Ayrton Senna' }));
    await screen.findByRole('alert');

    expect(await findA11yViolations()).toEqual([]);
  });
});
