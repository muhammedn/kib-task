export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results: R[] = new Array(items.length);
  let index = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (index < items.length) {
        const current = index++;
        results[current] = await fn(items[current]);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

export function formatTmdbDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
