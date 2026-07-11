import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Queue a TMDB sync job' })
  @ApiOkResponse({
    description: 'Sync job queued',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', example: '1' },
        status: { type: 'string', example: 'queued' },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('movies')
  triggerSync() {
    return this.syncService.enqueueSync();
  }
}
