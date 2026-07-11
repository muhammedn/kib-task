import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

describe('SyncController', () => {
  let controller: SyncController;
  let syncService: { runFullSync: jest.Mock };

  beforeEach(async () => {
    syncService = { runFullSync: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [{ provide: SyncService, useValue: syncService }],
    }).compile();

    controller = module.get(SyncController);
  });

  it('trigger sync successfully', () => {
    const result = { genresSynced: 1, moviesSynced: 20 };
    syncService.runFullSync.mockReturnValue(result);

    expect(controller.triggerSync()).toBe(result);
    expect(syncService.runFullSync).toHaveBeenCalled();
  });
});
