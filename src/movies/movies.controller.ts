import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/interfaces/auth.interface';
import { WatchlistService } from '../watchlist/watchlist.service';
import { QueryMoviesDto } from './dto/query-movies.dto';
import { RateMovieDto } from './dto/rate-movie.dto';
import { MoviesService } from './movies.service';

@ApiTags('movies')
@Controller('movies')
export class MoviesController {
  constructor(
    private readonly moviesService: MoviesService,
    private readonly watchlistService: WatchlistService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List movies',
  })
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() query: QueryMoviesDto) {
    return this.moviesService.findAll(query);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a movie by id' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.moviesService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rate a movie' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/rate')
  rate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RateMovieDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.moviesService.rateMovie(currentUser.userId!, id, dto.score);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a movie to watchlist' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/watchlist')
  addToWatchlist(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.watchlistService.add(currentUser.userId!, id);
  }
}
