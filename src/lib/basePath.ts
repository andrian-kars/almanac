/**
 * The router's basename for the address the site is built for (Vite's BASE_URL): "/" in the
 * container, "/almanac/" on GitHub Pages and andrian-kars.com. Without the trailing slash,
 * because andrian-kars.com redirects /almanac/ to /almanac.
 */
export function routerBasename(baseUrl: string): string {
  return baseUrl.replace(/(.)\/$/, '$1');
}
