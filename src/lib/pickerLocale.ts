/**
 * Locale data for the MUI date picker. The picker formats through dayjs, which needs a
 * locale file per language (field order, first day of the week, month names).
 *
 * Each file is a separate lazy chunk, so a visitor downloads only their own language.
 * Languages not listed here get the built-in US English.
 */

const DEFAULT_LOCALE = 'en';

const LOCALE_LOADERS: Record<string, () => Promise<unknown>> = {
  de: () => import('dayjs/locale/de'),
  'en-au': () => import('dayjs/locale/en-au'),
  'en-ca': () => import('dayjs/locale/en-ca'),
  'en-gb': () => import('dayjs/locale/en-gb'),
  'en-ie': () => import('dayjs/locale/en-ie'),
  'en-in': () => import('dayjs/locale/en-in'),
  'en-nz': () => import('dayjs/locale/en-nz'),
  es: () => import('dayjs/locale/es'),
  fr: () => import('dayjs/locale/fr'),
  it: () => import('dayjs/locale/it'),
  ja: () => import('dayjs/locale/ja'),
  nl: () => import('dayjs/locale/nl'),
  pl: () => import('dayjs/locale/pl'),
  pt: () => import('dayjs/locale/pt'),
  'pt-br': () => import('dayjs/locale/pt-br'),
  uk: () => import('dayjs/locale/uk'),
  'zh-cn': () => import('dayjs/locale/zh-cn'),
};

/**
 * Maps a browser language tag to a dayjs locale name: the exact region if bundled
 * ("en-GB" → "en-gb"), else the base language ("es-MX" → "es"), else English.
 */
export function resolvePickerLocale(language: string): string {
  const tag = language.toLowerCase();
  if (Object.hasOwn(LOCALE_LOADERS, tag)) return tag;

  const base = tag.split('-')[0] ?? '';
  if (Object.hasOwn(LOCALE_LOADERS, base)) return base;

  return DEFAULT_LOCALE;
}

/** Loads the dayjs locale for a browser language and returns the name to give the picker. */
export async function loadPickerLocale(language: string): Promise<string> {
  const locale = resolvePickerLocale(language);
  const load = LOCALE_LOADERS[locale];
  if (!load) return DEFAULT_LOCALE;

  try {
    await load();
    return locale;
  } catch {
    // A failed chunk download must not break the picker; English always works.
    return DEFAULT_LOCALE;
  }
}
