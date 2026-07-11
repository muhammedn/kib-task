import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WatchlistService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: number, movieId: number) {
    const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      throw new NotFoundException(`Movie with id ${movieId} not found`);
    }

    const existing = await this.prisma.watchlistItem.findUnique({
      where: { userId_movieId: { userId, movieId } },
    });
    if (existing) {
      throw new ConflictException('Movie already in your watchlist');
    }

    return this.prisma.watchlistItem.create({ data: { userId, movieId } });
  }

  async remove(userId: number, movieId: number) {
    const existing = await this.prisma.watchlistItem.findUnique({
      where: { userId_movieId: { userId, movieId } },
    });
    if (!existing) {
      throw new NotFoundException('Movie is not in your watchlist');
    }

    await this.prisma.watchlistItem.delete({
      where: { userId_movieId: { userId, movieId } },
    });
    return { message: 'Removed from watchlist' };
  }

  async findAllForUser(userId: number) {
    const items = await this.prisma.watchlistItem.findMany({
      where: { userId },
      include: { movie: true },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => item.movie);
  }
}
