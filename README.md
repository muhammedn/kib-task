# TMDB Movies API

An End-to-End Restful App that syncs movies from TMDB into PostgreSQL and exposes a REST API for browsing, searching, rating, and watchlists. Built with **NestJS**, **PostgreSQL**, **Prisma**, **Redis**, and **BullMQ**.

## Prerequisites

- A TMDB account and API key
- **Docker & Docker Compose**, or Node.js 20+, PostgreSQL 16, and Redis 7 for local dev

Replace the placeholder JWT secrets in `.env` before deploying publicly.

## Run with Docker

```bash
cp .env.example .env
# Set TMDB_API_KEY and ADMIN_EMAIL in .env

docker-compose up --build
```

- API: **http://localhost:8080**
- Swagger: **http://localhost:8080/api/docs**

On first start, migrations run and a background sync pulls genres and movies from TMDB. The movie list may be empty for a few seconds until that finishes.

## Try the API

### Regular user (browse, rate, watchlist)

1. `POST /auth/register` with any email
2. Open Swagger → **Authorize** → paste `Bearer <accessToken>`
3. Use `GET /movies`, `GET /genres`, rate a movie, or add to watchlist

Example:

```
GET /movies?search=inception&genre=Action&page=1&limit=10
```

### Admin (manual sync)

1. Set `ADMIN_EMAIL=admin@example.com` in `.env` **before** registering
2. `POST /auth/register` with that exact email
3. Authorize in Swagger with `Bearer <accessToken>`
4. Call `POST /sync/movies` — returns `{ jobId, status: "queued" }`

Registering a different email always yields `USER`, even when `ADMIN_EMAIL` is set.

Full endpoint list and request shapes are in Swagger at `/api/docs`.

## Authentication & roles

- **JWT** protects all movie, genre, watchlist, and sync routes.
- **Roles**: `USER` (default) and `ADMIN`.
- **Admin assignment**: only at registration. If the email matches `ADMIN_EMAIL` (case-insensitive), the user gets `ADMIN`. There is no promote-to-admin endpoint.

| Endpoint | Auth | Role |
|----------|------|------|
| `POST /auth/register`, `POST /auth/login` | Public | — |
| `GET /movies`, `GET /genres`, rate, watchlist | JWT | USER or ADMIN |
| `POST /sync/movies` | JWT | ADMIN only |
| Startup / nightly sync | Internal (BullMQ) | — |

Non-admin users calling `POST /sync/movies` receive **403 Forbidden**.

## Environment variables

See [`.env.example`](.env.example). Docker Compose sets `DATABASE_URL` and `REDIS_URL` automatically.

| Variable | Purpose |
|----------|---------|
| `TMDB_API_KEY` | Your TMDB API key (required) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing |
| `ADMIN_EMAIL` | Email that receives `ADMIN` role on registration; required to test manual sync |
| `TMDB_SYNC_PAGES` | Pages of popular movies on first sync (default `5`) |
| `TMDB_SYNC_CONCURRENCY` | Parallel TMDB calls during sync (default `10`) |
| `CACHE_TTL_SECONDS` | Redis cache TTL in seconds (default `300`) |

## How it works

- TMDB data is synced into **PostgreSQL** in the background — the API reads from the DB, not TMDB directly.
- **First sync** seeds genres and popular movies. **Later syncs** only pull what changed (via TMDB's change feed).
- Sync runs through a **BullMQ** queue (startup, manual `POST /sync/movies`, and a nightly job). HTTP handlers return immediately with `{ jobId, status: "queued" }`. Manual sync is **admin-only**; startup and scheduled sync run automatically without HTTP auth.
- **Redis** caches movie lists, movie detail, and genres. Rating a movie bumps the list-cache version and clears that movie's detail cache, so `GET /movies` reflects updated `averageUserRating` immediately. After a TMDB sync, the list version is bumped and the genres cache is cleared so new data appears without waiting for TTL.
- **JWT** protects movie, genre, watchlist, and sync routes. **Role-based access** restricts manual sync to admin users.

## Why built this way

- **Postgres as source of truth** — fast reads even when TMDB is slow or down.
- **TmdbService vs SyncService** — HTTP calls and DB writes are separate, easier to test and change.
- **BullMQ for sync** — long TMDB fetches don't block API requests.
- **Incremental sync** — after the first import, only changed movies are updated.
- **Cache-aside in services** — explicit cache keys per query, versioned list keys for O(1) invalidation on ratings and sync.
- **JWT auth + admin roles** — secures APIs; manual sync is admin-only to prevent abuse of expensive TMDB/DB sync jobs. Admins are assigned at registration via `ADMIN_EMAIL`.

## Testing

```bash
npm run test
```

## Project structure

```
src/
  auth/       register, login, logout, refresh, roles guard (JWT + RBAC)
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
