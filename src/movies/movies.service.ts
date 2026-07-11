import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryMoviesDto } from './dto/query-movies.dto';

@Injectable()
export class MoviesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryMoviesDto) {
    const {
      search,
      genreId,
      page = 1,
      limit = 20,
      sortBy = 'popularity',
      order = 'desc',
    } = query;

    const where: Prisma.MovieWhereInput = {
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
      ...(genreId && { genres: { some: { genreId } } }),
    };

    const [movies, total] = await Promise.all([
      this.prisma.movie.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: order },
        include: { genres: { include: { genre: true } } },
      }),
      this.prisma.movie.count({ where }),
    ]);

    const movieIds = movies.map((m) => m.id);
    const averages = await this.getAverageRatingsForMovies(movieIds);

    return {
      data: movies.map((movie) =>
        this.serializeMovie(movie, averages[movie.id]),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: number) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      include: { genres: { include: { genre: true } } },
    });
    if (!movie) throw new NotFoundException(`Movie with id ${id} not found`);

    const averages = await this.getAverageRatingsForMovies([id]);
    return this.serializeMovie(movie, averages[id]);
  }

  async rateMovie(userId: number, movieId: number, score: number) {
    const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      throw new NotFoundException(`Movie with id ${movieId} not found`);
    }

    const rating = await this.prisma.rating.upsert({
      where: { userId_movieId: { userId, movieId } },
      update: { score },
      create: { userId, movieId, score },
    });

    const { average, count } = await this.getAverageRating(movieId);
    return { rating, averageRating: average, ratingsCount: count };
  }

  private async getAverageRating(movieId: number) {
    const result = await this.prisma.rating.aggregate({
      where: { movieId },
      _avg: { score: true },
      _count: { score: true },
    });
    return {
      average: result._avg.score ? Number(result._avg.score.toFixed(2)) : null,
      count: result._count.score,
    };
  }

  private async getAverageRatingsForMovies(movieIds: number[]) {
    if (movieIds.length === 0) return {};

    const grouped = await this.prisma.rating.groupBy({
      by: ['movieId'],
      where: { movieId: { in: movieIds } },
      _avg: { score: true },
      _count: { score: true },
    });

    const map: Record<number, { average: number | null; count: number }> = {};
    for (const row of grouped) {
      map[row.movieId] = {
        average: row._avg.score ? Number(row._avg.score.toFixed(2)) : null,
        count: row._count.score,
      };
    }
    return map;
  }

  private serializeMovie(
    movie: Prisma.MovieGetPayload<{
      include: { genres: { include: { genre: true } } };
    }>,
    ratingAgg?: { average: number | null; count: number },
  ) {
    return {
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      releaseDate: movie.releaseDate,
      posterPath: movie.posterPath,
      backdropPath: movie.backdropPath,
      originalLanguage: movie.originalLanguage,
      popularity: movie.popularity,
      voteAverage: movie.voteAverage,
      voteCount: movie.voteCount,
      genres: movie.genres.map((g) => ({ id: g.genre.id, name: g.genre.name })),
      averageUserRating: ratingAgg?.average ?? null,
      userRatingsCount: ratingAgg?.count ?? 0,
    };
  }
}
