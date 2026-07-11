import type { Cache } from 'cache-manager';
import {
  bumpMoviesListVersion,
  DEFAULT_MOVIES_LIST_VERSION,
  getMoviesListVersion,
  MOVIES_LIST_VERSION_KEY,
} from './cache.constants';

describe('cache.constants', () => {
  let cache: { get: jest.Mock; set: jest.Mock };

  beforeEach(() => {
    cache = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe('getMoviesListVersion', () => {
    it('returns default version when cache is empty', async () => {
      cache.get.mockResolvedValue(undefined);

      await expect(getMoviesListVersion(cache as unknown as Cache)).resolves.toBe(
        DEFAULT_MOVIES_LIST_VERSION,
      );
      expect(cache.get).toHaveBeenCalledWith(MOVIES_LIST_VERSION_KEY);
    });

    it('returns stored version when present', async () => {
      cache.get.mockResolvedValue(4);

      await expect(getMoviesListVersion(cache as unknown as Cache)).resolves.toBe(
        4,
      );
    });
  });

  describe('bumpMoviesListVersion', () => {
    it('increments version from default when unset', async () => {
      cache.get.mockResolvedValue(undefined);

      await expect(bumpMoviesListVersion(cache as unknown as Cache)).resolves.toBe(
        DEFAULT_MOVIES_LIST_VERSION + 1,
      );
      expect(cache.set).toHaveBeenCalledWith(
        MOVIES_LIST_VERSION_KEY,
        DEFAULT_MOVIES_LIST_VERSION + 1,
      );
    });

    it('increments existing version', async () => {
      cache.get.mockResolvedValue(3);

      await expect(bumpMoviesListVersion(cache as unknown as Cache)).resolves.toBe(
        4,
      );
      expect(cache.set).toHaveBeenCalledWith(MOVIES_LIST_VERSION_KEY, 4);
    });
  });
});
