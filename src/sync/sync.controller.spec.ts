import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

describe('SyncController', () => {
  let controller: SyncController;
  let syncService: { enqueueSync: jest.Mock };

  beforeEach(async () => {
    syncService = { enqueueSync: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [{ provide: SyncService, useValue: syncService }],
    }).compile();

    controller = module.get(SyncController);
  });

  it('triggerSync enqueues sync job', () => {
    const result = { jobId: 'job-1', status: 'queued' as const };
    syncService.enqueueSync.mockReturnValue(result);

    expect(controller.triggerSync()).toBe(result);
    expect(syncService.enqueueSync).toHaveBeenCalled();
  });
});
