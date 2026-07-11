import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GenresService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async findAll() {
    const cached = await this.cache.get(this.getCacheKey());
    if (cached) return cached;

    const genres = await this.prisma.genre.findMany({
      orderBy: { name: 'asc' },
    });
    await this.cache.set(this.getCacheKey(), genres);
    return genres;
  }

  private getCacheKey() {
    return `genres:all`;
  }
}
