import { describe, expect, it, vi } from 'vitest';
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
