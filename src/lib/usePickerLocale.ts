import { useEffect, useState } from 'react';
import { loadPickerLocale, resolvePickerLocale } from './pickerLocale';

/**
 * The dayjs locale name for the date picker, following the browser language.
 * Starts as English and switches once the locale file has loaded.
 */
export function usePickerLocale(): string {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const language = navigator.language;
    // English is built in: nothing to load, no state update.
    if (resolvePickerLocale(language) === 'en') return;

    let cancelled = false;
    void loadPickerLocale(language).then((loaded) => {
      if (!cancelled) setLocale(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return locale;
}
