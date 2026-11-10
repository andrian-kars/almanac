import { createTheme, responsiveFontSizes } from '@mui/material/styles';

/**
 * `cssVariables` exposes the theme as `--mui-*` custom properties, so plain CSS
 * and CSS Modules can use the same colors and spacing as MUI components.
 *
 * `responsiveFontSizes` scales headings down on small screens, so a long date such as
 * "September 30, 2024" stays on one line on a phone.
 */
export const theme = responsiveFontSizes(
  createTheme({
    cssVariables: true,
  }),
);
