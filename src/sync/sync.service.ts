import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../prisma/prisma.service';
import { TmdbService } from '../tmdb/tmdb.service';
import { TmdbMovie } from '../tmdb/interfaces/tmdb.interface';

@Injectable()
export class SyncService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdb: TmdbService,
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const cron = this.config.getOrThrow('tmdb.syncCron');
    const job = new CronJob(cron, () => {
      this.scheduledSync().catch((err) =>
        console.log('Scheduled sync failed', err),
      );
    });
    this.schedulerRegistry.addCronJob('tmdb-sync', job);
    job.start();

    if (this.config.getOrThrow('tmdb.syncOnStartup')) {
      this.runFullSync().catch((err) =>
        console.log('Startup sync failed', err),
      );
    }
  }

  async scheduledSync() {
    await this.runFullSync();
  }

  async runFullSync() {
    const apiKey = this.config.getOrThrow('tmdb.apiKey');
    if (!apiKey) {
      console.log('No TMDB_API_KEY found');
      return { genresSynced: 0, moviesSynced: 0 };
    }

    console.log('start sync genres');
    const genresSynced = await this.syncGenres();

    const pages = this.config.getOrThrow('tmdb.syncPages');
    let moviesSynced = 0;
    for (let page = 1; page <= pages; page++) {
      const response = await this.tmdb.getPopularMovies(page);
      await this.upsertMovies(response.results);
      moviesSynced += response.results.length;
    }

    console.log(
      `sync complete: ${genresSynced} genres, ${moviesSynced} movies`,
    );
    return { genresSynced, moviesSynced };
  }

  private async syncGenres(): Promise<number> {
    const genres = await this.tmdb.getGenres();
    for (const genre of genres) {
      await this.prisma.genre.upsert({
        where: { id: genre.id },
        update: { name: genre.name },
        create: { id: genre.id, name: genre.name },
      });
    }
    return genres.length;
  }

  private async upsertMovies(movies: TmdbMovie[]) {
    for (const movie of movies) {
      await this.prisma.movie.upsert({
        where: { id: movie.id },
        update: {
          title: movie.title,
          overview: movie.overview,
          releaseDate: movie.release_date ? new Date(movie.release_date) : null,
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          originalLanguage: movie.original_language,
          popularity: movie.popularity,
          voteAverage: movie.vote_average,
          voteCount: movie.vote_count,
        },
        create: {
          id: movie.id,
          title: movie.title,
          overview: movie.overview,
          releaseDate: movie.release_date ? new Date(movie.release_date) : null,
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          originalLanguage: movie.original_language,
          popularity: movie.popularity,
          voteAverage: movie.vote_average,
          voteCount: movie.vote_count,
        },
      });

      await this.prisma.movieGenre.deleteMany({ where: { movieId: movie.id } });
      for (const genreId of movie.genre_ids ?? []) {
        await this.prisma.movieGenre
          .create({ data: { movieId: movie.id, genreId } })
          .catch(() => {
            console.log(`genre ${genreId} not found`);
          });
      }
    }
  }
}
