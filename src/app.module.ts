import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AppCacheModule } from './cache/cache.module';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { GenresModule } from './genres/genres.module';
import { MoviesModule } from './movies/movies.module';
import { PrismaModule } from './prisma/prisma.module';
import { SyncModule } from './sync/sync.module';
import { TmdbModule } from './tmdb/tmdb.module';
import { UsersModule } from './users/users.module';
import { WatchlistModule } from './watchlist/watchlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    AppCacheModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    TmdbModule,
    SyncModule,
    GenresModule,
    MoviesModule,
    WatchlistModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
