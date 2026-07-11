import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { TmdbModule } from '../tmdb/tmdb.module';
import { SYNC_QUEUE } from './sync.constants';
import { SyncController } from './sync.controller';
import { SyncProcessor } from './sync.processor';
import { SyncService } from './sync.service';

@Module({
  imports: [
    TmdbModule,
    BullModule.registerQueueAsync({
      name: SYNC_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow('cache.redisUrl') },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      }),
    }),
  ],
  controllers: [SyncController],
  providers: [SyncService, SyncProcessor],
  exports: [SyncService],
})
export class SyncModule {}
