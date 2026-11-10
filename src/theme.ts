import { createTheme } from '@mui/material/styles';

/**
 * `cssVariables` exposes the theme as `--mui-*` custom properties, so plain CSS
 * and CSS Modules can use the same colors and spacing as MUI components.
 */
export const theme = createTheme({
  cssVariables: true,
});
