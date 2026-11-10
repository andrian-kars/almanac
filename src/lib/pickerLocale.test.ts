import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { loadPickerLocale, resolvePickerLocale } from './pickerLocale';

describe('resolvePickerLocale', () => {
  it.each([
    ['en-US', 'en'],
    ['en', 'en'],
    ['en-GB', 'en-gb'],
    ['es', 'es'],
    ['es-ES', 'es'],
    // No Mexican variant is bundled, so the base language is used.
    ['es-MX', 'es'],
    ['uk-UA', 'uk'],
    ['pt-BR', 'pt-br'],
    ['pt-PT', 'pt'],
    ['de-AT', 'de'],
  ])('%s → %s', (language, expected) => {
    expect(resolvePickerLocale(language)).toBe(expected);
  });

  it.each(['xx-YY', 'tlh', ''])('falls back to English for unsupported "%s"', (language) => {
    expect(resolvePickerLocale(language)).toBe('en');
  });
});

describe('loadPickerLocale', () => {
  it('registers the locale with dayjs and returns its name', async () => {
    await expect(loadPickerLocale('es-ES')).resolves.toBe('es');

    expect(dayjs('2024-05-01').locale('es').format('MMMM')).toBe('mayo');
  });

  it('returns English without loading anything for en-US', async () => {
    await expect(loadPickerLocale('en-US')).resolves.toBe('en');
  });
});
