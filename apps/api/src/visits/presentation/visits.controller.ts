import { Body, Controller, Get, Headers, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { recordVisitSchema } from '@heritage/shared-types';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { VisitEventsService } from '../application/visit-events.service';
import {
  ApiJsonOk,
  ApiProtectedErrors,
  ApiResourceNotFound,
  ApiValidationError,
  SITE_VISIT_STATS_EXAMPLE,
  SITE_VISIT_STATS_SCHEMA,
} from '../../common/openapi/openapi';
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

@ApiTags('admin-sites')
@ApiCookieAuth('heritage_access')
@Controller('admin/sites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminVisitsController {
  constructor(private readonly visitEventsService: VisitEventsService) {}

  @Get(':id/visit-stats')
  @ApiJsonOk('Get scan and visit statistics for a site', SITE_VISIT_STATS_SCHEMA, SITE_VISIT_STATS_EXAMPLE)
  @ApiResourceNotFound('Site')
  @ApiProtectedErrors()
  getStats(@Param('id') id: string) {
    return this.visitEventsService.getStats(id);
  }
}
