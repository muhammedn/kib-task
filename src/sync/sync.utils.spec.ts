import { formatTmdbDate, mapWithConcurrency } from './sync.utils';

describe('sync.utils', () => {
  describe('mapWithConcurrency', () => {
    it('returns empty array for no items', async () => {
      const fn = jest.fn();

      await expect(mapWithConcurrency([], 3, fn)).resolves.toEqual([]);
      expect(fn).not.toHaveBeenCalled();
    });

    it('maps items with concurrency limit', async () => {
      const items = [1, 2, 3, 4];
      const fn = jest.fn(async (n: number) => n * 2);

      await expect(mapWithConcurrency(items, 2, fn)).resolves.toEqual([
        2, 4, 6, 8,
      ]);
      expect(fn).toHaveBeenCalledTimes(4);
    });
  });

  describe('formatTmdbDate', () => {
    it('formats date as YYYY-MM-DD', () => {
      expect(formatTmdbDate(new Date('2026-07-11T15:30:00.000Z'))).toBe(
        '2026-07-11',
      );
    });
  });
});
