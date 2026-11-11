/*
 * Light or dark is decided here, before the app's code loads, so the page never flashes the
 * wrong one. index.html loads this file with a plain script tag in <head>, which runs before
 * the page is drawn. It is served as it is, not built: it needs nothing the app itself does
 * not. The storage key and the attribute mirror src/lib/colorMode.ts, and
 * src/colorSchemeScript.test.ts fails if they drift apart.
 *
 * A separate file rather than an inline script, so the security policy can forbid inline
 * scripts entirely (see nginx/security-headers.conf).
 */
{
  let mode = null;
  try {
    mode = localStorage.getItem('almanac.colorMode.v1');
  } catch {
    // Storage is blocked: follow the device.
  }
  const systemIsDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const isDark = mode === 'dark' || (mode !== 'light' && systemIsDark);
  const root = document.documentElement;
  root.setAttribute('data-color-scheme', isDark ? 'dark' : 'light');

  // Browsers leave backgrounds out of print, so light text would land on white paper:
  // printing always uses the light scheme, then puts back whatever was showing.
  let beforePrint = null;
  window.addEventListener('beforeprint', () => {
    beforePrint = root.getAttribute('data-color-scheme');
    root.setAttribute('data-color-scheme', 'light');
  });
  window.addEventListener('afterprint', () => {
    if (beforePrint) root.setAttribute('data-color-scheme', beforePrint);
    beforePrint = null;
  });
}
