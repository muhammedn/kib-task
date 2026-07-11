import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { TmdbService } from './tmdb.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TmdbService', () => {
  let service: TmdbService;

  beforeEach(async () => {
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
    jest.clearAllMocks();
  });

  describe('getGenres', () => {
    it('returns genres from TMDB successfully', async () => {
      const genres = [{ id: 28, name: 'Action' }];
      mockedAxios.get.mockResolvedValue({ data: { genres } });

      await expect(service.getGenres()).resolves.toEqual(genres);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.themoviedb.org/3/genre/movie/list',
        expect.objectContaining({
          params: { api_key: 'test-api-key', language: 'en-US' },
        }),
      );
    });

    it('throws an error on failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('network error'));

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
      mockedAxios.get.mockResolvedValue({ data: response });

      await expect(service.getPopularMovies(2)).resolves.toEqual(response);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.themoviedb.org/3/movie/popular',
        expect.objectContaining({
          params: { api_key: 'test-api-key', language: 'en-US', page: 2 },
        }),
      );
    });

    it('uses default page when not provided successfully', async () => {
      const response = {
        page: 1,
        results: [],
        total_pages: 1,
        total_results: 0,
      };
      mockedAxios.get.mockResolvedValue({ data: response });

      await service.getPopularMovies();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.themoviedb.org/3/movie/popular',
        expect.objectContaining({
          params: expect.objectContaining({ page: 1 }),
        }),
      );
    });

    it('throws an error on failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('network error'));

      await expect(service.getPopularMovies()).rejects.toThrow(
        new HttpException(
          'Failed to fetch movies from TMDB',
          HttpStatus.BAD_GATEWAY,
        ),
      );
    });
  });
});
