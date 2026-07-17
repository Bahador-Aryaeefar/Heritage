import { Controller, Get } from '@nestjs/common';
import { HealthService } from '../application/health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): Promise<{ status: 'ok'; database: 'up' }> {
    return this.healthService.check();
  }
}
