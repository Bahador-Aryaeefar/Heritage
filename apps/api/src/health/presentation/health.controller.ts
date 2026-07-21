import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from '../application/health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check API and database health' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['status', 'database'],
      properties: {
        status: { type: 'string', enum: ['ok'], example: 'ok' },
        database: { type: 'string', enum: ['up'], example: 'up' },
      },
    },
    example: { status: 'ok', database: 'up' },
  })
  check(): Promise<{ status: 'ok'; database: 'up' }> {
    return this.healthService.check();
  }
}
