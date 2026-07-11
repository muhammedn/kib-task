# TMDB Movies API

A End-to-End Restful App that syncs movies from TMDB into PostgreSQL and exposes a REST API for browsing, searching, rating, and watchlists. Built with **NestJS**, **PostgreSQL**, **Prisma**, **Redis**, and **BullMQ**.

## Prerequisites

- A TMDB account and API key
- **Docker & Docker Compose**, or Node.js 20+, PostgreSQL 16, and Redis 7 for local dev

Replace the placeholder JWT secrets in `.env` before deploying publicly.

## Run with Docker

```bash
cp .env.example .env
# Set TMDB_API_KEY in .env

docker-compose up --build
```

- API: **http://localhost:8080**
- Swagger: **http://localhost:8080/api/docs**

On first start, migrations run and a background sync pulls genres and movies from TMDB. The movie list may be empty for a few seconds until that finishes.

## Try the API

Routes are Guarded with JWT. Quick path:

1. `POST /auth/register` or `POST /auth/login` — copy the `accessToken`
2. Open Swagger → **Authorize** → paste `Bearer <accessToken>`
3. Try `GET /movies`, `GET /genres`, rate a movie, or add to watchlist

Example:

```
GET /movies?search=inception&genre=Action&page=1&limit=10
```

Full endpoint list and request shapes are in Swagger at `/api/docs`.


## Environment variables

See [`.env.example`](.env.example). Docker Compose sets `DATABASE_URL` and `REDIS_URL` automatically.

| Variable | Purpose |
|----------|---------|
| `TMDB_API_KEY` | Your TMDB API key (required) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing |
| `TMDB_SYNC_PAGES` | Pages of popular movies on first sync (default `5`) |
| `TMDB_SYNC_CONCURRENCY` | Parallel TMDB calls during sync (default `10`) |
| `CACHE_TTL_SECONDS` | Redis cache TTL in seconds (default `300`) |

## How it works

- TMDB data is synced into **PostgreSQL** in the background — the API reads from the DB, not TMDB directly.
- **First sync** seeds genres and popular movies. **Later syncs** only pull what changed (via TMDB's change feed).
- Sync runs through a **BullMQ** queue (startup, manual `POST /sync/movies`, and a nightly job). HTTP handlers return immediately with `{ jobId, status: "queued" }`.
- **Redis** caches movie lists, movie detail, and genres. Rating a movie clears that movie's cache.
- **JWT** protects movie, genre, watchlist, and sync routes.

## Why built this way

- **Postgres as source of truth** — fast reads even when TMDB is slow or down.
- **TmdbService vs SyncService** — HTTP calls and DB writes are separate, easier to test and change.
- **BullMQ for sync** — long TMDB fetches don't block API requests.
- **Incremental sync** — after the first import, only changed movies are updated.
- **Cache-aside in services** — explicit cache keys per query, targeted invalidation on ratings.
- **JWT auth** — satisfies the security nice-to-have; ratings and watchlist are tied to a user.

## Testing

```bash
npm run test
```

## Project structure

```
src/
  auth/       register, login, logout, refresh (JWT)
  users/      user persistence
  tmdb/       TMDB HTTP client
  sync/       BullMQ queue, processor, sync logic
  movies/     list, search, filter by genre, rate
  genres/     genre listing
  watchlist/  favorites
  cache/      Redis cache module
  config/     env validation + typed config
  prisma/     Prisma client wrapper
prisma/       schema + migrations
```
