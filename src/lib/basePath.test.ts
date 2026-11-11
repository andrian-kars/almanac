import { describe, expect, it } from 'vitest';
import { routerBasename } from './basePath';

describe('routerBasename', () => {
  it('keeps the root as it is', () => {
    expect(routerBasename('/')).toBe('/');
  });

  // andrian-kars.com redirects /almanac/ to /almanac. With a trailing slash in the basename,
  // the router would not recognise /almanac and show the error page.
  it('drops the trailing slash of a sub-path', () => {
    expect(routerBasename('/almanac/')).toBe('/almanac');
  });
});
