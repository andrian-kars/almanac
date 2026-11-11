import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { COLOR_MODE_STORAGE_KEY, colorModeStorage } from './lib/colorMode';
import { createQueryClient } from './lib/queryClient';
import { theme } from './theme';

type AppProvidersProps = {
  children: ReactNode;
  /** dayjs locale for the date picker, already loaded (see `loadPickerLocale`). */
  pickerLocale?: string;
  /** Tests pass their own client so no cached data leaks between tests. */
  queryClient?: QueryClient;
};

/** App-wide providers, shared by the real entry point and the tests. */
export function AppProviders({ children, pickerLocale = 'en', queryClient }: AppProvidersProps) {
  // Created once per mounted app, never at module load.
  const [client] = useState(() => queryClient ?? createQueryClient());

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
