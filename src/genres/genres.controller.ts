import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GenresService } from './genres.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('genres')
@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all movie genres' })
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.genresService.findAll();
  }
}
