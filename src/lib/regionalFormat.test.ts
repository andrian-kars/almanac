import { describe, expect, it, vi } from 'vitest';
import { getDisplayLocale } from './date';
import { defaultUnitSystem, formatLanguage, unitStore } from './regionalFormat';

const useBrowser = (language: string) =>
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(language);

describe('defaultUnitSystem', () => {
  it.each([
    ['en-US', 'imperial'],
    ['en', 'imperial'],
    ['es-US', 'imperial'],
    ['en-GB', 'metric'],
    ['uk-UA', 'metric'],
    ['not a locale!', 'metric'],
  ])('%s → %s', (language, expected) => {
    expect(defaultUnitSystem(language)).toBe(expected);
  });
});

describe('formatLanguage: the language dates, times and numbers are written in', () => {
  it.each([
    ['en-US', 'the US'],
    ['en-GB', 'Britain'],
    ['uk-UA', 'Ukraine'],
    ['es-MX', 'Mexico'],
  ])('is the browser’s own (%s) until a choice is made, as in %s', (language) => {
    useBrowser(language);

    expect(formatLanguage()).toBe(language);
  });

  it('becomes British English when a US browser chooses metric', () => {
    useBrowser('en-US');
    unitStore.set('metric');

    expect(formatLanguage()).toBe('en-GB');
  });

  it.each(['en-GB', 'uk-UA', 'es-MX'])(
    'becomes US English when a %s browser chooses imperial',
    (language) => {
      useBrowser(language);
      unitStore.set('imperial');

      expect(formatLanguage()).toBe('en-US');
    },
  );

  it.each([
    ['en-US', 'imperial'],
    ['uk-UA', 'metric'],
  ] as const)('stays %s when the choice is what that browser uses anyway', (language, units) => {
    useBrowser(language);
    unitStore.set(units);

    expect(formatLanguage()).toBe(language);
  });

  it('goes back to the browser’s own after switching there and back', () => {
    useBrowser('uk-UA');
    unitStore.set('imperial');
    unitStore.set('metric');

    expect(formatLanguage()).toBe('uk-UA');
  });
});

describe('getDisplayLocale', () => {
  it('follows the choice by default', () => {
    useBrowser('en-US');
    unitStore.set('metric');

    expect(getDisplayLocale()).toBe('en-GB');
  });

  it('still resolves a language given to it, whatever the choice', () => {
    unitStore.set('metric');

    expect(getDisplayLocale('es-ES')).toBe('es-ES');
  });
});
