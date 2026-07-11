import { Test, TestingModule } from '@nestjs/testing';
import type { CurrentUserPayload } from '../auth/interfaces/auth.interface';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';

describe('WatchlistController', () => {
  let controller: WatchlistController;
  let watchlistService: {
    findAllForUser: jest.Mock;
    remove: jest.Mock;
  };

  const currentUser: CurrentUserPayload = {
    userId: 1,
    userKey: 'key',
    email: 'a@b.com',
  };

  beforeEach(async () => {
    watchlistService = {
      findAllForUser: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WatchlistController],
      providers: [{ provide: WatchlistService, useValue: watchlistService }],
    }).compile();

    controller = module.get(WatchlistController);
  });

  it('find all watchlist items successfully', () => {
    const movies = [{ id: 1 }];
    watchlistService.findAllForUser.mockReturnValue(movies);

    expect(controller.findAll(currentUser)).toBe(movies);
    expect(watchlistService.findAllForUser).toHaveBeenCalledWith(1);
  });

  it('remove from watchlist successfully', () => {
    const result = { message: 'Removed from watchlist' };
    watchlistService.remove.mockReturnValue(result);

    expect(controller.remove(1, currentUser)).toBe(result);
    expect(watchlistService.remove).toHaveBeenCalledWith(1, 1);
  });
});
