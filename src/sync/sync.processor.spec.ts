import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { SyncProcessor } from './sync.processor';
import { SyncService } from './sync.service';

describe('SyncProcessor', () => {
  let processor: SyncProcessor;
  let syncService: { runFullSync: jest.Mock };

  beforeEach(async () => {
    syncService = { runFullSync: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncProcessor,
        { provide: SyncService, useValue: syncService },
      ],
    }).compile();

    processor = module.get(SyncProcessor);
  });

  it('runs full sync successfully', async () => {
    const result = { genresSynced: 1, moviesSynced: 2 };
    syncService.runFullSync.mockResolvedValue(result);

    await expect(
      processor.process({ data: { source: 'scheduled' } } as Job),
    ).resolves.toEqual(result);
    expect(syncService.runFullSync).toHaveBeenCalledWith('scheduled');
  });
});
