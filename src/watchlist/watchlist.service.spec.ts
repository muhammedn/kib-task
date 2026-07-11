import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { WatchlistService } from './watchlist.service';

describe('WatchlistService', () => {
  let service: WatchlistService;
  let prisma: {
    movie: { findUnique: jest.Mock };
    watchlistItem: {
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const movie = { id: 1, title: 'Movie' };
  const watchlistItem = { id: 1, userId: 1, movieId: 1 };

  beforeEach(async () => {
    prisma = {
      movie: { findUnique: jest.fn() },
      watchlistItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchlistService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(WatchlistService);
  });

  describe('add', () => {
    it('adds movie to watchlist successfully', async () => {
      prisma.movie.findUnique.mockResolvedValue(movie);
      prisma.watchlistItem.findUnique.mockResolvedValue(null);
      prisma.watchlistItem.create.mockResolvedValue(watchlistItem);

      await expect(service.add(1, 1)).resolves.toBe(watchlistItem);
      expect(prisma.watchlistItem.create).toHaveBeenCalledWith({
        data: { userId: 1, movieId: 1 },
      });
    });

    it('throws an error when movie does not exist', async () => {
      prisma.movie.findUnique.mockResolvedValue(null);

      await expect(service.add(1, 99)).rejects.toThrow(NotFoundException);
    });

    it('throws an error when movie already in watchlist', async () => {
      prisma.movie.findUnique.mockResolvedValue(movie);
      prisma.watchlistItem.findUnique.mockResolvedValue(watchlistItem);

      await expect(service.add(1, 1)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('removes movie from watchlist successfully', async () => {
      prisma.watchlistItem.findUnique.mockResolvedValue(watchlistItem);
      prisma.watchlistItem.delete.mockResolvedValue(watchlistItem);

      await expect(service.remove(1, 1)).resolves.toEqual({
        message: 'Removed from watchlist',
      });
    });

    it('throws an error when item not in watchlist', async () => {
      prisma.watchlistItem.findUnique.mockResolvedValue(null);

      await expect(service.remove(1, 99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllForUser', () => {
    it('returns movies from watchlist items successfully', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([
        { movie },
        { movie: { id: 2, title: 'Other' } },
      ]);

      await expect(service.findAllForUser(1)).resolves.toEqual([
        movie,
        { id: 2, title: 'Other' },
      ]);
      expect(prisma.watchlistItem.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: { movie: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
