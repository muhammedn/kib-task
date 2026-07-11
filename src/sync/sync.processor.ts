import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SyncService } from './sync.service';
import { SYNC_QUEUE } from './sync.constants';

@Processor(SYNC_QUEUE, { concurrency: 1 })
export class SyncProcessor extends WorkerHost {
  constructor(private readonly syncService: SyncService) {
    super();
  }

  process(job: Job): Promise<{ genresSynced: number; moviesSynced: number }> {
    return this.syncService.runFullSync(job.data?.source);
  }
}
