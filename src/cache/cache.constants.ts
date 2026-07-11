import type { Cache } from 'cache-manager';

export const MOVIES_LIST_VERSION_KEY = 'movies:list:version';
export const GENRES_ALL_CACHE_KEY = 'genres:all';
export const DEFAULT_MOVIES_LIST_VERSION = 1;

export async function getMoviesListVersion(cache: Cache): Promise<number> {
  const version = await cache.get<number>(MOVIES_LIST_VERSION_KEY);
  return version ?? DEFAULT_MOVIES_LIST_VERSION;
}

export async function bumpMoviesListVersion(cache: Cache): Promise<number> {
  const current = await getMoviesListVersion(cache);
  const next = current + 1;
  await cache.set(MOVIES_LIST_VERSION_KEY, next);
  return next;
}
