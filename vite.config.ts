import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Third-party code in a few chunks by library, instead of one large file. Browsers download
 * them in parallel, and a release that only changes the app's own code leaves these cached.
 * The first group that matches a module wins.
 *
 * The date picker's language files (dayjs/locale) are left out of every group: each is
 * loaded on its own, only for the browser language that needs it (see pickerLocale.ts).
 */
const NOT_A_LOCALE = '(?![\\\\/]?dayjs[\\\\/]locale[\\\\/])';
const nodeModule = (packages: string) =>
  new RegExp(`[\\\\/]node_modules[\\\\/]${NOT_A_LOCALE}(${packages})[\\\\/]`);

const vendorChunks = [
  { name: 'react', test: nodeModule('react|react-dom|scheduler|react-router') },
  { name: 'date-picker', test: nodeModule('@mui[\\\\/]x-date-pickers|dayjs') },
  { name: 'mui', test: nodeModule('@mui|@emotion|@popperjs|react-transition-group') },
  { name: 'vendor', test: nodeModule('[^\\\\/]+') },
];

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Small files are normally written into the CSS or JS as data: addresses. Not fonts:
    // browsers fetch each font file only when a page needs its characters, so inlining
    // would make everyone download them, and the security policy allows fonts only from
    // the site itself (nginx/security-headers.conf). Other files keep the default.
    assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined),
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: vendorChunks.map((group, index) => ({
            ...group,
            // Earlier groups take precedence.
            priority: vendorChunks.length - index,
          })),
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
