import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import indexHtml from '../index.html?raw';
import { COLOR_MODE_STORAGE_KEY, COLOR_SCHEME_ATTRIBUTE } from './lib/colorMode';
import { mockSystemColorScheme } from './test/systemColorScheme';
import { theme } from './theme';

/**
 * index.html sets the color scheme with a small inline script before the app's code loads,
 * so the page never flashes the wrong scheme. It cannot import from the app, so these tests
 * keep it in step with what the app uses.
 */
const inlineScript = /<script>([\s\S]*?)<\/script>/.exec(indexHtml)?.[1] ?? '';

/**
 * Listeners the script adds to the window. A real page runs it once; tests run it many
 * times, so each test removes what it added, or earlier runs would react to later events.
 */
const added: Array<[string, EventListenerOrEventListenerObject]> = [];
const addListener = window.addEventListener.bind(window);

beforeEach(() => {
  vi.spyOn(window, 'addEventListener').mockImplementation(
    (type: string, listener: EventListenerOrEventListenerObject | null) => {
      if (!listener) return;
      added.push([type, listener]);
      addListener(type, listener);
    },
  );
});

afterEach(() => {
  for (const [type, listener] of added.splice(0)) window.removeEventListener(type, listener);
});

function runInlineScript() {
  document.documentElement.removeAttribute(COLOR_SCHEME_ATTRIBUTE);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the app's own script, read from index.html, has to be run to be tested
  const run = new Function(inlineScript) as () => void;
  run();
  return document.documentElement.getAttribute(COLOR_SCHEME_ATTRIBUTE);
}

describe('the inline color scheme script', () => {
  it('exists', () => {
    expect(inlineScript).not.toBe('');
  });

  it.each([
    { stored: null, system: 'light', expected: 'light' },
    { stored: null, system: 'dark', expected: 'dark' },
    { stored: 'system', system: 'dark', expected: 'dark' },
    { stored: 'dark', system: 'light', expected: 'dark' },
    { stored: 'light', system: 'dark', expected: 'light' },
    { stored: 'purple', system: 'dark', expected: 'dark' },
    { stored: 'purple', system: 'light', expected: 'light' },
  ] as const)(
    'sets "$expected" when "$stored" is stored and the system is $system',
    ({ stored, system, expected }) => {
      if (stored !== null) localStorage.setItem(COLOR_MODE_STORAGE_KEY, stored);
      mockSystemColorScheme(system);

      expect(runInlineScript()).toBe(expected);
    },
  );

  it('follows the system when storage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    mockSystemColorScheme('dark');

    expect(runInlineScript()).toBe('dark');
  });

  it('does not break the page where the system preference cannot be read', () => {
    // jsdom has no matchMedia, like a very old browser.
    expect(runInlineScript()).toBe('light');
  });
});

describe('printing', () => {
  // Browsers leave page backgrounds out of print, so the night edition's light text would
  // land on white paper. Printing always uses the day edition.
  it('switches to the light scheme to print, and back afterwards', () => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'dark');
    mockSystemColorScheme('light');
    expect(runInlineScript()).toBe('dark');

    window.dispatchEvent(new Event('beforeprint'));
    expect(document.documentElement.getAttribute(COLOR_SCHEME_ATTRIBUTE)).toBe('light');

    window.dispatchEvent(new Event('afterprint'));
    expect(document.documentElement.getAttribute(COLOR_SCHEME_ATTRIBUTE)).toBe('dark');
  });

  it('restores whatever scheme was showing when printing started', () => {
    mockSystemColorScheme('light');
    runInlineScript();
    // The user switched to dark after the page loaded.
    document.documentElement.setAttribute(COLOR_SCHEME_ATTRIBUTE, 'dark');

    window.dispatchEvent(new Event('beforeprint'));
    window.dispatchEvent(new Event('afterprint'));

    expect(document.documentElement.getAttribute(COLOR_SCHEME_ATTRIBUTE)).toBe('dark');
  });
});

describe('the page before the app loads', () => {
  it.each(['light', 'dark'] as const)('has the %s scheme’s background', (scheme) => {
    const background = theme.colorSchemes[scheme]?.palette.background.default;

    expect(background).toBeDefined();
    expect(indexHtml).toContain(`background-color: ${background}`);
  });

  it('selects the dark background by the same attribute as the theme', () => {
    expect(indexHtml).toContain(`html[${COLOR_SCHEME_ATTRIBUTE}='dark']`);
  });
});
