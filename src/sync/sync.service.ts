import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TmdbService } from '../tmdb/tmdb.service';
import { TmdbMovie, TmdbMovieDetail } from '../tmdb/interfaces/tmdb.interface';
import {
  SYNC_JOB,
  SYNC_QUEUE,
  SYNC_REPEAT_KEY,
  SYNC_STATE_KEY,
} from './sync.constants';
import { formatTmdbDate, mapWithConcurrency } from './sync.utils';

type MovieInput = TmdbMovie | TmdbMovieDetail;

@Injectable()
export class SyncService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdb: TmdbService,
    private readonly config: ConfigService,
    @InjectQueue(SYNC_QUEUE) private readonly syncQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.registerRepeatableSync();
    await this.enqueueSync('startup');
  }

  async enqueueSync(
    source: 'manual' | 'startup' = 'manual',
  ): Promise<{ jobId: string; status: 'queued' }> {
    const job = await this.syncQueue.add(SYNC_JOB, { source });
    return { jobId: job.id!, status: 'queued' };
  }

  async registerRepeatableSync(): Promise<void> {
    const pattern = this.config.getOrThrow<string>('tmdb.syncCron');
    const repeatables = await this.syncQueue.getRepeatableJobs();

    for (const job of repeatables) {
      if (job.name === SYNC_JOB) {
        await this.syncQueue.removeRepeatableByKey(job.key);
      }
    }

    await this.syncQueue.add(
      SYNC_JOB,
      { source: 'scheduled' },
      {
        repeat: { pattern },
        jobId: SYNC_REPEAT_KEY,
      },
    );
  }

  async runFullSync(source = 'unknown') {
    const apiKey = this.config.getOrThrow<string>('tmdb.apiKey');
    if (!apiKey) {
      console.log('No TMDB_API_KEY found');
      return { genresSynced: 0, moviesSynced: 0 };
    }

    console.log(`start sync (${source})`);
    const genresSynced = await this.syncGenres();

    const state = await this.prisma.syncState.findUnique({
      where: { key: SYNC_STATE_KEY },
    });
    const moviesSynced = state?.lastSyncedAt
      ? await this.incrementalSync(state.lastSyncedAt)
      : await this.seedPopular();

    await this.prisma.syncState.upsert({
      where: { key: SYNC_STATE_KEY },
      update: { lastSyncedAt: new Date() },
      create: { key: SYNC_STATE_KEY, lastSyncedAt: new Date() },
    });

    console.log(
      `sync complete: ${genresSynced} genres, ${moviesSynced} movies`,
    );
    return { genresSynced, moviesSynced };
  }

  private async seedPopular(): Promise<number> {
    const pages = this.config.getOrThrow<number>('tmdb.syncPages');
    let moviesSynced = 0;

    for (let page = 1; page <= pages; page++) {
      const response = await this.tmdb.getPopularMovies(page);
      await this.upsertMovies(response.results);
      moviesSynced += response.results.length;
    }

    return moviesSynced;
  }

  private async incrementalSync(since: Date): Promise<number> {
    const startDate = formatTmdbDate(since);
    const endDate = formatTmdbDate(new Date());
    const changedIds = new Set<number>();

    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      const response = await this.tmdb.getMovieChanges(
        startDate,
        endDate,
        page,
      );
      for (const change of response.results) {
        changedIds.add(change.id);
      }
      totalPages = response.total_pages;
      page++;
    }

    if (changedIds.size === 0) {
      return 0;
    }

    const concurrency = this.config.getOrThrow<number>('tmdb.syncConcurrency');
    const movies = await mapWithConcurrency(
      [...changedIds],
      concurrency,
      (id) => this.tmdb.getMovie(id),
    );

    await this.upsertMovies(movies);
    return movies.length;
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

  private async upsertMovies(movies: MovieInput[]) {
    for (const movie of movies) {
      await this.upsertMovie(movie);
    }
  }

  private async upsertMovie(movie: MovieInput) {
    await this.prisma.movie.upsert({
      where: { id: movie.id },
      update: this.toMovieData(movie),
      create: { id: movie.id, ...this.toMovieData(movie) },
    });

    const genreIds = this.getGenreIds(movie);
    await this.prisma.movieGenre.deleteMany({ where: { movieId: movie.id } });

    if (genreIds.length > 0) {
      await this.prisma.movieGenre.createMany({
        data: genreIds.map((genreId) => ({ movieId: movie.id, genreId })),
        skipDuplicates: true,
      });
    }
  }

  private toMovieData(movie: MovieInput) {
    return {
      title: movie.title,
      overview: movie.overview,
      releaseDate: movie.release_date ? new Date(movie.release_date) : null,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      originalLanguage: movie.original_language,
      popularity: movie.popularity,
      voteAverage: movie.vote_average,
      voteCount: movie.vote_count,
    };
  }

  private getGenreIds(movie: MovieInput): number[] {
    if ('genres' in movie && Array.isArray(movie.genres)) {
      return movie.genres.map((genre) => genre.id);
    }
    return (movie as TmdbMovie).genre_ids ?? [];
  }
}
