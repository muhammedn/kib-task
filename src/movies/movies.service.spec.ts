import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { MoviesService } from './movies.service';

describe('MoviesService', () => {
  let service: MoviesService;
  let prisma: {
    movie: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock };
    rating: {
      groupBy: jest.Mock;
      aggregate: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let cache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  const rawMovie = {
    id: 1,
    title: 'Test Movie',
    overview: 'Overview',
    releaseDate: new Date('2020-01-01'),
    posterPath: '/poster.jpg',
    backdropPath: '/backdrop.jpg',
    originalLanguage: 'en',
    popularity: 100,
    voteAverage: 8.5,
    voteCount: 1000,
    genres: [{ genre: { id: 28, name: 'Action' } }],
  };

  beforeEach(async () => {
    prisma = {
      movie: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
      rating: {
        groupBy: jest.fn(),
        aggregate: jest.fn(),
        upsert: jest.fn(),
      },
    };
    cache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoviesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = module.get(MoviesService);
  });

  describe('findAll', () => {
    it('returns cached result successfully', async () => {
      const cached = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 1 },
      };
      cache.get.mockResolvedValue(cached);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toBe(cached);
      expect(prisma.movie.findMany).not.toHaveBeenCalled();
    });

    it('fetches movies and caches them successfully', async () => {
      cache.get.mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([rawMovie]);
      prisma.movie.count.mockResolvedValue(1);
      prisma.rating.groupBy.mockResolvedValue([
        { movieId: 1, _avg: { score: 4.5 }, _count: { score: 2 } },
      ]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 1,
        title: 'Test Movie',
        averageUserRating: 4.5,
        userRatingsCount: 2,
        genres: [{ id: 28, name: 'Action' }],
      });
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(cache.set).toHaveBeenCalled();
    });

    it('applies search and genre filters successfully', async () => {
      cache.get.mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([]);
      prisma.movie.count.mockResolvedValue(0);
      prisma.rating.groupBy.mockResolvedValue([]);

      await service.findAll({
        search: 'batman',
        genre: 'Action',
        page: 2,
        limit: 10,
      });

      expect(prisma.movie.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            title: { contains: 'batman', mode: 'insensitive' },
            genres: {
              some: {
                genre: { name: { equals: 'Action', mode: 'insensitive' } },
              },
            },
          },
          skip: 10,
          take: 10,
        }),
      );
    });

    it('applies search filter only successfully', async () => {
      cache.get.mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([]);
      prisma.movie.count.mockResolvedValue(0);

      await service.findAll({ search: 'batman' });

      expect(prisma.movie.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { title: { contains: 'batman', mode: 'insensitive' } },
        }),
      );
    });

    it('applies genre filter only successfully', async () => {
      cache.get.mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([]);
      prisma.movie.count.mockResolvedValue(0);

      await service.findAll({ genre: 'Action' });

      expect(prisma.movie.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            genres: {
              some: {
                genre: { name: { equals: 'Action', mode: 'insensitive' } },
              },
            },
          },
        }),
      );
    });

    it('handles movies with zero average rating in list successfully', async () => {
      cache.get.mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([rawMovie]);
      prisma.movie.count.mockResolvedValue(1);
      prisma.rating.groupBy.mockResolvedValue([
        { movieId: 1, _avg: { score: 0 }, _count: { score: 1 } },
      ]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data[0].averageUserRating).toBeNull();
    });

    it('handles empty movie list without rating query successfully', async () => {
      cache.get.mockResolvedValue(undefined);
      prisma.movie.findMany.mockResolvedValue([]);
      prisma.movie.count.mockResolvedValue(0);

      const result = await service.findAll({});

      expect(result.data).toEqual([]);
      expect(prisma.rating.groupBy).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns cached movie successfully', async () => {
      const cached = { id: 1, title: 'Cached' };
      cache.get.mockResolvedValue(cached);

      await expect(service.findOne(1)).resolves.toBe(cached);
    });

    it('fetches and caches movie successfully', async () => {
      cache.get.mockResolvedValue(undefined);
      prisma.movie.findUnique.mockResolvedValue(rawMovie);
      prisma.rating.groupBy.mockResolvedValue([]);

      const result = await service.findOne(1);

      expect(result).toMatchObject({
        id: 1,
        title: 'Test Movie',
        averageUserRating: null,
        userRatingsCount: 0,
      });
      expect(cache.set).toHaveBeenCalledWith('movies:detail:1', result);
    });

    it('throws an error when movie not found', async () => {
      cache.get.mockResolvedValue(undefined);
      prisma.movie.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('rateMovie', () => {
    it('upserts rating and invalidates detail cache successfully', async () => {
      prisma.movie.findUnique.mockResolvedValue(rawMovie);
      prisma.rating.upsert.mockResolvedValue({
        userId: 1,
        movieId: 1,
        score: 5,
      });
      prisma.rating.aggregate.mockResolvedValue({
        _avg: { score: 5 },
        _count: { score: 1 },
      });

      const result = await service.rateMovie(1, 1, 5);

      expect(result).toEqual({
        rating: { userId: 1, movieId: 1, score: 5 },
        averageRating: 5,
        ratingsCount: 1,
      });
      expect(cache.del).toHaveBeenCalledWith('movies:detail:1');
    });

    it('returns null average when no ratings successfully', async () => {
      prisma.movie.findUnique.mockResolvedValue(rawMovie);
      prisma.rating.upsert.mockResolvedValue({
        userId: 1,
        movieId: 1,
        score: 5,
      });
      prisma.rating.aggregate.mockResolvedValue({
        _avg: { score: null },
        _count: { score: 0 },
      });

      const result = await service.rateMovie(1, 1, 5);

      expect(result.averageRating).toBeNull();
      expect(result.ratingsCount).toBe(0);
    });

    it('throws an error when movie not found', async () => {
      prisma.movie.findUnique.mockResolvedValue(null);

      await expect(service.rateMovie(1, 99, 5)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
