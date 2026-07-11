import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SyncService } from './sync.service';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Queue a TMDB sync job (admin only)' })
  @ApiForbiddenResponse({ description: 'Requires admin role' })
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post('movies')
  triggerSync() {
    return this.syncService.enqueueSync();
  }
}
