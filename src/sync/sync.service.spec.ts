let cronCallback: () => void;

jest.mock('cron', () => ({
  CronJob: jest
    .fn()
    .mockImplementation((_time: string, callback: () => void) => {
      cronCallback = callback;
      return {
        start: jest.fn(),
        stop: jest.fn(),
        runOnce: false,
      };
    }),
}));

import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TmdbService } from '../tmdb/tmdb.service';
import { SyncService } from './sync.service';

describe('SyncService', () => {
  let service: SyncService;
  let prisma: {
    genre: { upsert: jest.Mock };
    movie: { upsert: jest.Mock };
    movieGenre: { deleteMany: jest.Mock; create: jest.Mock };
  };
  let tmdb: { getGenres: jest.Mock; getPopularMovies: jest.Mock };
  let config: { getOrThrow: jest.Mock };
  let schedulerRegistry: { addCronJob: jest.Mock };

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

  beforeEach(async () => {
    prisma = {
      genre: { upsert: jest.fn().mockResolvedValue({}) },
      movie: { upsert: jest.fn().mockResolvedValue({}) },
      movieGenre: {
        deleteMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    tmdb = {
      getGenres: jest.fn().mockResolvedValue([{ id: 28, name: 'Action' }]),
      getPopularMovies: jest.fn().mockResolvedValue({
        results: [tmdbMovie],
      }),
    };
    config = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'tmdb.apiKey': 'test-key',
          'tmdb.syncPages': 2,
          'tmdb.syncCron': '0 3 * * *',
          'tmdb.syncOnStartup': false,
        };
        return values[key];
      }),
    };
    schedulerRegistry = { addCronJob: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: prisma },
        { provide: TmdbService, useValue: tmdb },
        { provide: ConfigService, useValue: config },
        { provide: SchedulerRegistry, useValue: schedulerRegistry },
      ],
    }).compile();

    service = module.get(SyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    afterEach(() => {
      const job = schedulerRegistry.addCronJob.mock.results[0]?.value;
      job?.stop();
    });

    it('registers cron job', () => {
      service.onModuleInit();

      expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
        'tmdb-sync',
        expect.objectContaining({ runOnce: false }),
      );
    });

    it('handles startup sync failure successfully when enabled', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      config.getOrThrow.mockImplementation((key: string) => {
        const values: Record<string, unknown> = {
          'tmdb.apiKey': 'test-key',
          'tmdb.syncPages': 1,
          'tmdb.syncCron': '0 3 * * *',
          'tmdb.syncOnStartup': true,
        };
        return values[key];
      });
      jest
        .spyOn(service, 'runFullSync')
        .mockRejectedValue(new Error('startup fail'));

      service.onModuleInit();
      await new Promise((resolve) => setImmediate(resolve));

      expect(logSpy).toHaveBeenCalledWith(
        'Startup sync failed',
        expect.any(Error),
      );
      logSpy.mockRestore();
    });

    it('logs scheduled sync failures from cron callback successfully', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      jest
        .spyOn(service, 'runFullSync')
        .mockRejectedValue(new Error('cron fail'));

      service.onModuleInit();
      cronCallback();
      await new Promise((resolve) => setImmediate(resolve));

      expect(logSpy).toHaveBeenCalledWith(
        'Scheduled sync failed',
        expect.any(Error),
      );
      logSpy.mockRestore();
    });
  });

  describe('runFullSync', () => {
    it('syncs genres and movies successfully', async () => {
      const result = await service.runFullSync();

      expect(result).toEqual({ genresSynced: 1, moviesSynced: 2 });
      expect(tmdb.getGenres).toHaveBeenCalled();
      expect(tmdb.getPopularMovies).toHaveBeenCalledTimes(2);
      expect(prisma.genre.upsert).toHaveBeenCalled();
      expect(prisma.movie.upsert).toHaveBeenCalled();
      expect(prisma.movieGenre.deleteMany).toHaveBeenCalledWith({
        where: { movieId: 1 },
      });
    });

    it('returns zero counts when api key is not set', async () => {
      config.getOrThrow.mockImplementation((key: string) => {
        if (key === 'tmdb.apiKey') return '';
        return undefined;
      });

      const result = await service.runFullSync();

      expect(result).toEqual({ genresSynced: 0, moviesSynced: 0 });
      expect(tmdb.getGenres).not.toHaveBeenCalled();
    });

    it('handles missing genre when linking movie genres successfully', async () => {
      prisma.movieGenre.create.mockRejectedValue(new Error('FK violation'));
      config.getOrThrow.mockImplementation((key: string) => {
        const values: Record<string, unknown> = {
          'tmdb.apiKey': 'test-key',
          'tmdb.syncPages': 1,
          'tmdb.syncCron': '0 3 * * *',
          'tmdb.syncOnStartup': false,
        };
        return values[key];
      });

      await expect(service.runFullSync()).resolves.toEqual({
        genresSynced: 1,
        moviesSynced: 1,
      });
    });

    it('upserts movie without genre ids successfully', async () => {
      tmdb.getPopularMovies.mockResolvedValue({
        results: [{ ...tmdbMovie, genre_ids: undefined }],
      });
      config.getOrThrow.mockImplementation((key: string) => {
        const values: Record<string, unknown> = {
          'tmdb.apiKey': 'test-key',
          'tmdb.syncPages': 1,
          'tmdb.syncCron': '0 3 * * *',
          'tmdb.syncOnStartup': false,
        };
        return values[key];
      });

      await service.runFullSync();

      expect(prisma.movieGenre.deleteMany).toHaveBeenCalled();
      expect(prisma.movieGenre.create).not.toHaveBeenCalled();
    });

    it('upserts movie without release date successfully', async () => {
      tmdb.getPopularMovies.mockResolvedValue({
        results: [{ ...tmdbMovie, release_date: null, genre_ids: [] }],
      });
      config.getOrThrow.mockImplementation((key: string) => {
        const values: Record<string, unknown> = {
          'tmdb.apiKey': 'test-key',
          'tmdb.syncPages': 1,
          'tmdb.syncCron': '0 3 * * *',
          'tmdb.syncOnStartup': false,
        };
        return values[key];
      });

      await service.runFullSync();

      expect(prisma.movie.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ releaseDate: null }),
        }),
      );
    });
  });

  describe('scheduledSync', () => {
    it('runs full sync successfully', async () => {
      const runFullSyncSpy = jest
        .spyOn(service, 'runFullSync')
        .mockResolvedValue({ genresSynced: 1, moviesSynced: 1 });

      await service.scheduledSync();

      expect(runFullSyncSpy).toHaveBeenCalled();
    });
  });
});
