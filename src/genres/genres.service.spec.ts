import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { GenresService } from './genres.service';

describe('GenresService', () => {
  let service: GenresService;
  let prisma: { genre: { findMany: jest.Mock } };
  let cache: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    prisma = { genre: { findMany: jest.fn() } };
    cache = { get: jest.fn(), set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenresService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = module.get(GenresService);
  });

  it('returns cached genres successfully', async () => {
    const cached = [{ id: 1, name: 'Action' }];
    cache.get.mockResolvedValue(cached);

    await expect(service.findAll()).resolves.toBe(cached);
    expect(prisma.genre.findMany).not.toHaveBeenCalled();
  });

  it('fetches genres and caches them successfully', async () => {
    const genres = [{ id: 1, name: 'Action' }];
    cache.get.mockResolvedValue(undefined);
    prisma.genre.findMany.mockResolvedValue(genres);

    await expect(service.findAll()).resolves.toEqual(genres);
    expect(prisma.genre.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
    });
    expect(cache.set).toHaveBeenCalledWith('genres:all', genres);
  });
});
