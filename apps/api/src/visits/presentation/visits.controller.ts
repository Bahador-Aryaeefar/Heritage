import { Body, Controller, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { recordVisitSchema } from '@heritage/shared-types';
import { VisitEventsService } from '../application/visit-events.service';
import { ApiResourceNotFound, ApiValidationError } from '../../common/openapi/openapi';
import { SkipCsrf } from '../../common/security/skip-csrf.decorator';

@ApiTags('public')
@Controller('public/sites')
export class PublicVisitsController {
  constructor(private readonly visitEventsService: VisitEventsService) {}

  @Post(':slug/visits')
  @SkipCsrf()
  @HttpCode(204)
  @ApiValidationError()
  @ApiResourceNotFound('Site')
  async recordVisit(
    @Param('slug') slug: string,
    @Body() body: unknown,
    @Headers('user-agent') userAgent: string | undefined,
  ): Promise<void> {
    const input = recordVisitSchema.parse(body);
    await this.visitEventsService.recordVisit(slug, input, userAgent);
  }
}
