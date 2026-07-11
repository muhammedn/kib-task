import axios from 'axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TmdbGenre,
  TmdbMovie,
  TmdbPaginatedResponse,
} from './interfaces/tmdb.interface';

@Injectable()
export class TmdbService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.getOrThrow('tmdb.baseUrl');
    this.apiKey = this.config.getOrThrow('tmdb.apiKey');
  }

  async getGenres(): Promise<TmdbGenre[]> {
    try {
      const { data } = await axios.get<{ genres: TmdbGenre[] }>(
        `${this.baseUrl}/genre/movie/list`,
        {
          params: {
            api_key: this.apiKey,
            language: 'en-US',
          },
        },
      );

      return data.genres;
    } catch {
      throw new HttpException(
        'Failed to fetch genres from TMDB',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getPopularMovies(page = 1): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    try {
      const { data } = await axios.get<TmdbPaginatedResponse<TmdbMovie>>(
        `${this.baseUrl}/movie/popular`,
        {
          params: {
            api_key: this.apiKey,
            language: 'en-US',
            page,
          },
        },
      );

      return data;
    } catch {
      throw new HttpException(
        'Failed to fetch movies from TMDB',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
