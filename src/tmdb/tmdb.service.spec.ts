import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TmdbService } from './tmdb.service';

const httpGet = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({ get: httpGet })),
  },
}));

describe('TmdbService', () => {
  let service: TmdbService;

  beforeEach(async () => {
    httpGet.mockReset();

    const configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'tmdb.baseUrl') return 'https://api.themoviedb.org/3';
        if (key === 'tmdb.apiKey') return 'test-api-key';
        return '';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TmdbService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(TmdbService);
  });

  describe('getGenres', () => {
    it('returns genres from TMDB successfully', async () => {
      const genres = [{ id: 28, name: 'Action' }];
      httpGet.mockResolvedValue({ data: { genres } });

      await expect(service.getGenres()).resolves.toEqual(genres);
      expect(httpGet).toHaveBeenCalledWith(
        'https://api.themoviedb.org/3/genre/movie/list',
        expect.objectContaining({
          params: { api_key: 'test-api-key', language: 'en-US' },
        }),
      );
    });

    it('throws an error when fetching genres fails', async () => {
      httpGet.mockRejectedValue(new Error('network error'));

      await expect(service.getGenres()).rejects.toThrow(
        new HttpException(
          'Failed to fetch genres from TMDB',
          HttpStatus.BAD_GATEWAY,
        ),
      );
    });
  });

  describe('getPopularMovies', () => {
    it('returns paginated movies from TMDB successfully', async () => {
      const response = {
        page: 1,
        results: [{ id: 1, title: 'Movie' }],
        total_pages: 10,
        total_results: 200,
      };
      httpGet.mockResolvedValue({ data: response });

      await expect(service.getPopularMovies(2)).resolves.toEqual(response);
    });

    it('uses default page when not provided successfully', async () => {
      httpGet.mockResolvedValue({
        data: { page: 1, results: [], total_pages: 1, total_results: 0 },
      });

      await service.getPopularMovies();

      expect(httpGet).toHaveBeenCalledWith(
        'https://api.themoviedb.org/3/movie/popular',
        expect.objectContaining({
          params: expect.objectContaining({ page: 1 }),
        }),
      );
    });

    it('throws an error on failure', async () => {
      httpGet.mockRejectedValue(new Error('network error'));

      await expect(service.getPopularMovies()).rejects.toThrow(
        new HttpException(
          'Failed to fetch movies from TMDB',
          HttpStatus.BAD_GATEWAY,
        ),
      );
    });
  });

  describe('getMovieChanges', () => {
    it('returns paginated movie changes successfully', async () => {
      const response = {
        page: 1,
        results: [{ id: 42 }],
        total_pages: 1,
        total_results: 1,
      };
      httpGet.mockResolvedValue({ data: response });

      await expect(
        service.getMovieChanges('2026-01-01', '2026-01-31', 1),
      ).resolves.toEqual(response);
      expect(httpGet).toHaveBeenCalledWith(
        'https://api.themoviedb.org/3/movie/changes',
        expect.objectContaining({
          params: {
            api_key: 'test-api-key',
            start_date: '2026-01-01',
            end_date: '2026-01-31',
            page: 1,
          },
        }),
      );
    });

    it('throws an error on failure', async () => {
      httpGet.mockRejectedValue(new Error('network error'));

      await expect(
        service.getMovieChanges('2026-01-01', '2026-01-31'),
      ).rejects.toThrow(
        new HttpException(
          'Failed to fetch movie changes from TMDB',
          HttpStatus.BAD_GATEWAY,
        ),
      );
    });
  });

  describe('getMovie', () => {
    it('returns movie detail successfully', async () => {
      const movie = {
        id: 1,
        title: 'Movie',
        genres: [{ id: 28, name: 'Action' }],
      };
      httpGet.mockResolvedValue({ data: movie });

      await expect(service.getMovie(1)).resolves.toEqual(movie);
      expect(httpGet).toHaveBeenCalledWith(
        'https://api.themoviedb.org/3/movie/1',
        expect.objectContaining({
          params: { api_key: 'test-api-key', language: 'en-US' },
        }),
      );
    });

    it('throws an error on failure', async () => {
      httpGet.mockRejectedValue(new Error('network error'));

      await expect(service.getMovie(99)).rejects.toThrow(
        new HttpException(
          'Failed to fetch movie 99 from TMDB',
          HttpStatus.BAD_GATEWAY,
        ),
      );
    });
  });
});
