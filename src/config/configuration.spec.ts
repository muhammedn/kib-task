import configuration from './configuration';

describe('configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns defaults when env vars are missing', () => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.TMDB_API_KEY;
    delete process.env.REDIS_URL;
    delete process.env.CACHE_TTL_SECONDS;

    const config = configuration();

    expect(config.app.port).toBe(3000);
    expect(config.app.nodeEnv).toBe('development');
    expect(config.tmdb.apiKey).toBe('');
    expect(config.tmdb.baseUrl).toBe('https://api.themoviedb.org/3');
    expect(config.tmdb.syncPages).toBe(5);
    expect(config.tmdb.syncCron).toBe('0 3 * * *');
    expect(config.tmdb.syncConcurrency).toBe(10);
    expect(config.cache.redisUrl).toBe('redis://localhost:6379');
    expect(config.cache.ttl).toBe(300);
    expect(config.admin.email).toBe('');
  });

  it('maps env vars to typed config values', () => {
    process.env.PORT = '8080';
    process.env.NODE_ENV = 'production';
    process.env.TMDB_API_KEY = 'secret-key';
    process.env.TMDB_SYNC_PAGES = '3';
    process.env.TMDB_SYNC_CONCURRENCY = '5';
    process.env.REDIS_URL = 'redis://redis:6379';
    process.env.CACHE_TTL_SECONDS = '120';
    process.env.ADMIN_EMAIL = 'admin@example.com';

    const config = configuration();

    expect(config.app.port).toBe(8080);
    expect(config.app.nodeEnv).toBe('production');
    expect(config.tmdb.apiKey).toBe('secret-key');
    expect(config.tmdb.syncPages).toBe(3);
    expect(config.tmdb.syncConcurrency).toBe(5);
    expect(config.cache.redisUrl).toBe('redis://redis:6379');
    expect(config.cache.ttl).toBe(120);
    expect(config.admin.email).toBe('admin@example.com');
  });
});
