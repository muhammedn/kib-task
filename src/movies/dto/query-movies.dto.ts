import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum MovieSortField {
  POPULARITY = 'popularity',
  RELEASE_DATE = 'releaseDate',
  TITLE = 'title',
  VOTE_AVERAGE = 'voteAverage',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryMoviesDto {
  @ApiPropertyOptional({ description: 'Search movies by title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by genre name',
  })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: MovieSortField,
    default: MovieSortField.POPULARITY,
  })
  @IsOptional()
  @IsIn(Object.values(MovieSortField))
  sortBy?: MovieSortField = MovieSortField.POPULARITY;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsIn(Object.values(SortOrder))
  order?: SortOrder = SortOrder.DESC;
}
