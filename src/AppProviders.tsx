import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import type { ReactNode } from 'react';
import { theme } from './theme';

type AppProvidersProps = {
  children: ReactNode;
  /** dayjs locale for the date picker, already loaded (see `loadPickerLocale`). */
  pickerLocale?: string;
};

/** App-wide providers, shared by the real entry point and the tests. */
export function AppProviders({ children, pickerLocale = 'en' }: AppProvidersProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={pickerLocale}>
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  );
}
