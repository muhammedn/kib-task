import axios, { AxiosInstance } from 'axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TmdbChange,
  TmdbGenre,
  TmdbMovie,
  TmdbMovieDetail,
  TmdbPaginatedResponse,
} from './interfaces/tmdb.interface';

@Injectable()
export class TmdbService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.getOrThrow('tmdb.baseUrl');
    this.apiKey = this.config.getOrThrow('tmdb.apiKey');
    this.http = axios.create();
  }
  async getGenres(): Promise<TmdbGenre[]> {
    try {
      const { data } = await this.http.get<{ genres: TmdbGenre[] }>(
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
      const { data } = await this.http.get<TmdbPaginatedResponse<TmdbMovie>>(
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

  async getMovieChanges(
    startDate: string,
    endDate: string,
    page = 1,
  ): Promise<TmdbPaginatedResponse<TmdbChange>> {
    try {
      const { data } = await this.http.get<TmdbPaginatedResponse<TmdbChange>>(
        `${this.baseUrl}/movie/changes`,
        {
          params: {
            api_key: this.apiKey,
            start_date: startDate,
            end_date: endDate,
            page,
          },
        },
      );

      return data;
    } catch {
      throw new HttpException(
        'Failed to fetch movie changes from TMDB',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getMovie(id: number): Promise<TmdbMovieDetail> {
    try {
      const { data } = await this.http.get<TmdbMovieDetail>(
        `${this.baseUrl}/movie/${id}`,
        {
          params: {
            api_key: this.apiKey,
            language: 'en-US',
          },
        },
      );

      return data;
    } catch {
      throw new HttpException(
        `Failed to fetch movie ${id} from TMDB`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
