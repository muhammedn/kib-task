export default () => ({
  app: {
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  tmdb: {
    apiKey: process.env.TMDB_API_KEY ?? '',
    baseUrl: process.env.TMDB_BASE_URL ?? 'https://api.themoviedb.org/3',
    syncPages: parseInt(process.env.TMDB_SYNC_PAGES ?? '5', 10),
    syncOnStartup: (process.env.TMDB_SYNC_ON_STARTUP ?? 'true') === 'true',
    syncCron: process.env.TMDB_SYNC_CRON ?? '0 3 * * *',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  cache: {
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    ttl: parseInt(process.env.CACHE_TTL_SECONDS ?? '300', 10),
  },
});
