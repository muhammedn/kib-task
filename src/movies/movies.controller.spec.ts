import { Test, TestingModule } from '@nestjs/testing';
import type { CurrentUserPayload } from '../auth/interfaces/auth.interface';
import { WatchlistService } from '../watchlist/watchlist.service';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';

describe('MoviesController', () => {
  let controller: MoviesController;
  let moviesService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    rateMovie: jest.Mock;
  };
  let watchlistService: { add: jest.Mock };

  const currentUser: CurrentUserPayload = {
    userId: 1,
    userKey: 'key',
    email: 'a@b.com',
  };

  beforeEach(async () => {
    moviesService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      rateMovie: jest.fn(),
    };
    watchlistService = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoviesController],
      providers: [
        { provide: MoviesService, useValue: moviesService },
        { provide: WatchlistService, useValue: watchlistService },
      ],
    }).compile();

    controller = module.get(MoviesController);
  });

  it('find all movies successfully', () => {
    const query = { page: 1, limit: 20 };
    const result = { data: [], meta: {} };
    moviesService.findAll.mockReturnValue(result);

    expect(controller.findAll(query)).toBe(result);
    expect(moviesService.findAll).toHaveBeenCalledWith(query);
  });

  it('find one movie successfully', () => {
    const movie = { id: 1 };
    moviesService.findOne.mockReturnValue(movie);

    expect(controller.findOne(1)).toBe(movie);
    expect(moviesService.findOne).toHaveBeenCalledWith(1);
  });

  it('rate movie successfully', () => {
    const dto = { score: 5 };
    const result = { rating: {}, averageRating: 5, ratingsCount: 1 };
    moviesService.rateMovie.mockReturnValue(result);

    expect(controller.rate(1, dto, currentUser)).toBe(result);
    expect(moviesService.rateMovie).toHaveBeenCalledWith(1, 1, 5);
  });

  it('add to watchlist successfully', () => {
    const item = { id: 1 };
    watchlistService.add.mockReturnValue(item);

    expect(controller.addToWatchlist(1, currentUser)).toBe(item);
    expect(watchlistService.add).toHaveBeenCalledWith(1, 1);
  });
});
