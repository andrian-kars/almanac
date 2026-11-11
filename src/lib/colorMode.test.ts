import { describe, expect, it, vi } from 'vitest';
import { COLOR_MODE_STORAGE_KEY, colorModeStorage } from './colorMode';

const SCHEME_KEY = 'unused-light';

const modeStorage = () => colorModeStorage({ key: COLOR_MODE_STORAGE_KEY });

describe('colorModeStorage', () => {
  it.each(['light', 'dark', 'system'])('reads the stored mode "%s"', (mode) => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);

    expect(modeStorage().get('system')).toBe(mode);
  });

  it('gives the default when nothing is stored', () => {
    expect(modeStorage().get('system')).toBe('system');
  });

  it.each(['purple', '', 'DARK', '{"mode":"dark"}'])(
    'gives the default for the unknown stored value "%s"',
    (value) => {
      localStorage.setItem(COLOR_MODE_STORAGE_KEY, value);

      expect(modeStorage().get('system')).toBe('system');
    },
  );

  it('stores a mode', () => {
    modeStorage().set('dark');

    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('dark');
  });

  it('stores nothing but the mode: MUI’s other keys are not kept', () => {
    const schemeStorage = colorModeStorage({ key: SCHEME_KEY });

    schemeStorage.set('dark');

    expect(localStorage.getItem(SCHEME_KEY)).toBeNull();
    expect(schemeStorage.get('light')).toBe('light');
    expect(localStorage).toHaveLength(0);
  });

  it('copes with storage that cannot be read or written', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(modeStorage().get('system')).toBe('system');
    expect(() => modeStorage().set('dark')).not.toThrow();
  });

  describe('changes made in another tab', () => {
    const storageEvent = (key: string, newValue: string | null) =>
      new StorageEvent('storage', { key, newValue });

    it('are passed on', () => {
      const handler = vi.fn();
      modeStorage().subscribe(handler);

      window.dispatchEvent(storageEvent(COLOR_MODE_STORAGE_KEY, 'dark'));

      expect(handler).toHaveBeenCalledWith('dark');
    });

    it('report a cleared or unknown value as "nothing stored"', () => {
      const handler = vi.fn();
      modeStorage().subscribe(handler);

      window.dispatchEvent(storageEvent(COLOR_MODE_STORAGE_KEY, null));
      window.dispatchEvent(storageEvent(COLOR_MODE_STORAGE_KEY, 'purple'));

      expect(handler.mock.calls).toEqual([[null], [null]]);
    });

    it('are ignored for other keys, and after unsubscribing', () => {
      const handler = vi.fn();
      const unsubscribe = modeStorage().subscribe(handler);

      window.dispatchEvent(storageEvent('almanac.bookmarks.v1', 'dark'));
      unsubscribe();
      window.dispatchEvent(storageEvent(COLOR_MODE_STORAGE_KEY, 'dark'));

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
