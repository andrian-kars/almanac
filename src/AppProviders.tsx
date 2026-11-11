import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import { COLOR_MODE_STORAGE_KEY, colorModeStorage } from './lib/colorMode';
import { loadPickerLocale } from './lib/pickerLocale';
import { createQueryClient } from './lib/queryClient';
import { useDisplayLocale } from './lib/useDisplayLocale';
import { theme } from './theme';

type AppProvidersProps = {
  children: ReactNode;
  /**
   * dayjs locale for the date picker, already loaded for the first render (see
   * `loadPickerLocale`), so the field never starts in one order and switches.
   */
  pickerLocale?: string;
  /** Tests pass their own client so no cached data leaks between tests. */
  queryClient?: QueryClient;
};

/**
 * The date picker's locale: the one loaded before the first render, then whichever the
 * units and date format choice calls for. Its language file is fetched when the choice
 * changes; the field keeps its current order for the moment that takes.
 */
function usePickerLocale(initial: string): string {
  const displayLocale = useDisplayLocale();
  const [pickerLocale, setPickerLocale] = useState(initial);

  useEffect(() => {
    let isCurrent = true;
    void loadPickerLocale(displayLocale).then((loaded) => {
      if (isCurrent) setPickerLocale(loaded);
    });
    return () => {
      isCurrent = false;
    };
  }, [displayLocale]);

  return pickerLocale;
}

/** App-wide providers, shared by the real entry point and the tests. */
export function AppProviders({
  children,
  pickerLocale: initialPickerLocale = 'en',
  queryClient,
}: AppProvidersProps) {
  // Created once per mounted app, never at module load.
  const [client] = useState(() => queryClient ?? createQueryClient());
  const pickerLocale = usePickerLocale(initialPickerLocale);

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider
        theme={theme}
        // Follows the device until the user chooses (see ColorModeToggle).
        defaultMode="system"
        modeStorageKey={COLOR_MODE_STORAGE_KEY}
        storageManager={colorModeStorage}
        // The app renders in the browser only, so the mode is known on the first render.
        noSsr
        // Switching recolors everything at once instead of fading piece by piece.
        disableTransitionOnChange
      >
        {/* enableColorScheme: scrollbars and native controls follow the scheme too. */}
        <CssBaseline enableColorScheme />
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={pickerLocale}>
          {children}
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
