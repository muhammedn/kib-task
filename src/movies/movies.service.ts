import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MoviesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const movies = await this.prisma.movie.findMany({
      include: { genres: { include: { genre: true } } },
    });
    return movies.map((m) => this.serializeMovie(m));
  }

  async findOne(id: number) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      include: { genres: { include: { genre: true } } },
    });
    if (!movie) throw new NotFoundException(`Movie with id ${id} not found`);
    return this.serializeMovie(movie);
  }

  private serializeMovie(
    movie: Prisma.MovieGetPayload<{
      include: { genres: { include: { genre: true } } };
    }>,
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
      tmdbVoteAverage: movie.tmdbVoteAverage,
      tmdbVoteCount: movie.tmdbVoteCount,
      genres: movie.genres.map((g) => ({ id: g.genre.id, name: g.genre.name })),
    };
  }
}
