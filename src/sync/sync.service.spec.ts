import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TmdbService } from '../tmdb/tmdb.service';
import { SYNC_JOB, SYNC_QUEUE, SYNC_REPEAT_KEY } from './sync.constants';
import { SyncService } from './sync.service';

describe('SyncService', () => {
  let service: SyncService;
  let prisma: {
    genre: { upsert: jest.Mock };
    movie: { upsert: jest.Mock };
    movieGenre: {
      deleteMany: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
    };
    syncState: { findUnique: jest.Mock; upsert: jest.Mock };
  };
  let tmdb: {
    getGenres: jest.Mock;
    getPopularMovies: jest.Mock;
    getMovieChanges: jest.Mock;
    getMovie: jest.Mock;
  };
  let config: { getOrThrow: jest.Mock };
  let syncQueue: {
    add: jest.Mock;
    getRepeatableJobs: jest.Mock;
    removeRepeatableByKey: jest.Mock;
  };

  const tmdbMovie = {
    id: 1,
    title: 'Movie',
    overview: 'Overview',
    release_date: '2020-01-01',
    poster_path: '/poster.jpg',
    backdrop_path: '/backdrop.jpg',
    original_language: 'en',
    popularity: 100,
    vote_average: 8.5,
    vote_count: 1000,
    genre_ids: [28],
  };

  const defaultConfig: Record<string, unknown> = {
    'tmdb.apiKey': 'test-key',
    'tmdb.syncPages': 2,
    'tmdb.syncCron': '0 3 * * *',
    'tmdb.syncConcurrency': 10,
  };

  beforeEach(async () => {
    prisma = {
      genre: { upsert: jest.fn().mockResolvedValue({}) },
      movie: { upsert: jest.fn().mockResolvedValue({}) },
      movieGenre: {
        deleteMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      syncState: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    tmdb = {
      getGenres: jest.fn().mockResolvedValue([{ id: 28, name: 'Action' }]),
      getPopularMovies: jest.fn().mockResolvedValue({
        results: [tmdbMovie],
      }),
      getMovieChanges: jest.fn().mockResolvedValue({
        results: [{ id: 2 }],
        total_pages: 1,
      }),
      getMovie: jest.fn().mockResolvedValue({
        ...tmdbMovie,
        id: 2,
        genres: [{ id: 28, name: 'Action' }],
      }),
    };
    config = {
      getOrThrow: jest.fn((key: string) => defaultConfig[key]),
    };
    syncQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
      getRepeatableJobs: jest.fn().mockResolvedValue([]),
      removeRepeatableByKey: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: prisma },
        { provide: TmdbService, useValue: tmdb },
        { provide: ConfigService, useValue: config },
        { provide: getQueueToken(SYNC_QUEUE), useValue: syncQueue },
      ],
    }).compile();

    service = module.get(SyncService);
  });

  describe('enqueueSync', () => {
    it('adds a one-shot job to the queue', async () => {
      await expect(service.enqueueSync()).resolves.toEqual({
        jobId: 'job-1',
        status: 'queued',
      });
      expect(syncQueue.add).toHaveBeenCalledWith(SYNC_JOB, { source: 'manual' });
    });
  });

  describe('registerRepeatableSync', () => {
    it('registers repeatable job with cron pattern', async () => {
      await service.registerRepeatableSync();

      expect(syncQueue.add).toHaveBeenCalledWith(
        SYNC_JOB,
        { source: 'scheduled' },
        {
          repeat: { pattern: '0 3 * * *' },
          jobId: SYNC_REPEAT_KEY,
        },
      );
    });

    it('removes existing repeatable jobs before registering', async () => {
      syncQueue.getRepeatableJobs.mockResolvedValue([
        { name: SYNC_JOB, key: 'repeat-key' },
      ]);

      await service.registerRepeatableSync();

      expect(syncQueue.removeRepeatableByKey).toHaveBeenCalledWith('repeat-key');
    });
  });

  describe('onModuleInit', () => {
    it('registers repeatable sync and enqueues startup job', async () => {
      await service.onModuleInit();

      expect(syncQueue.getRepeatableJobs).toHaveBeenCalled();
      expect(syncQueue.add).toHaveBeenCalledWith(SYNC_JOB, { source: 'startup' });
    });
  });

  describe('runFullSync', () => {
    it('seeds popular movies when no watermark exists', async () => {
      const result = await service.runFullSync('manual');

      expect(result).toEqual({ genresSynced: 1, moviesSynced: 2 });
      expect(tmdb.getPopularMovies).toHaveBeenCalledTimes(2);
      expect(tmdb.getMovieChanges).not.toHaveBeenCalled();
      expect(prisma.syncState.upsert).toHaveBeenCalled();
    });

    it('runs incremental sync when watermark exists successfully', async () => {
      prisma.syncState.findUnique.mockResolvedValue({
        key: 'movies',
        lastSyncedAt: new Date('2026-01-01'),
      });

      const result = await service.runFullSync('scheduled');

      expect(result).toEqual({ genresSynced: 1, moviesSynced: 1 });
      expect(tmdb.getMovieChanges).toHaveBeenCalled();
      expect(tmdb.getMovie).toHaveBeenCalledWith(2);
      expect(tmdb.getPopularMovies).not.toHaveBeenCalled();
    });

    it('returns zero movies when incremental sync finds no changes successfully', async () => {
      prisma.syncState.findUnique.mockResolvedValue({
        key: 'movies',
        lastSyncedAt: new Date('2026-01-01'),
      });
      tmdb.getMovieChanges.mockResolvedValue({
        results: [],
        total_pages: 1,
      });

      const result = await service.runFullSync('scheduled');

      expect(result).toEqual({ genresSynced: 1, moviesSynced: 0 });
      expect(tmdb.getMovie).not.toHaveBeenCalled();
    });

    it('returns zero counts when api key is not set', async () => {
      config.getOrThrow.mockImplementation((key: string) => {
        if (key === 'tmdb.apiKey') return '';
        return defaultConfig[key];
      });

      const result = await service.runFullSync();

      expect(result).toEqual({ genresSynced: 0, moviesSynced: 0 });
      expect(tmdb.getGenres).not.toHaveBeenCalled();
    });

    it('uses createMany for genre links successfully', async () => {
      config.getOrThrow.mockImplementation((key: string) => {
        if (key === 'tmdb.syncPages') return 1;
        return defaultConfig[key];
      });

      await service.runFullSync();

      expect(prisma.movieGenre.createMany).toHaveBeenCalledWith({
        data: [{ movieId: 1, genreId: 28 }],
        skipDuplicates: true,
      });
    });

    it('upserts movie without genre ids successfully', async () => {
      tmdb.getPopularMovies.mockResolvedValue({
        results: [{ ...tmdbMovie, genre_ids: undefined }],
      });
      config.getOrThrow.mockImplementation((key: string) => {
        if (key === 'tmdb.syncPages') return 1;
        return defaultConfig[key];
      });

      await service.runFullSync();

      expect(prisma.movieGenre.createMany).not.toHaveBeenCalled();
    });
  });
});
