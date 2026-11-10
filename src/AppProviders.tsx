import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import type { ReactNode } from 'react';
import { usePickerLocale } from './lib/usePickerLocale';
import { theme } from './theme';

/** App-wide providers, shared by the real entry point and the tests. */
export function AppProviders({ children }: { children: ReactNode }) {
  const pickerLocale = usePickerLocale();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={pickerLocale}>
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  );
}
