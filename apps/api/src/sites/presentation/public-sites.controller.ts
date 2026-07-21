import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { LandingResponse, SiteDetail } from '@heritage/shared-types';
import { QrService } from '../../qr/application/qr.service';
import { SitesService } from '../application/sites.service';
import { PaginationQueryDto } from '../../common/pagination/pagination';
import {
  SITE_CARD_EXAMPLE,
  SITE_CARD_SCHEMA,
  SITE_DETAIL_EXAMPLE,
  SITE_DETAIL_SCHEMA,
  ApiJsonOk,
  ApiPaginatedResponse,
  ApiResourceNotFound,
} from '../../common/openapi/openapi';

@ApiTags('public')
@Controller('public/landing')
export class PublicLandingController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  @ApiPaginatedResponse('List active public heritage sites', SITE_CARD_SCHEMA, SITE_CARD_EXAMPLE)
  getLanding(@Query() query: PaginationQueryDto): Promise<LandingResponse> {
    return this.sitesService.getLanding(query);
  }
}

@ApiTags('public')
@Controller('public/sites')
export class PublicSitesController {
  constructor(
    private readonly sitesService: SitesService,
    private readonly qrService: QrService,
  ) {}

  @Get(':slug/qr.png')
  @ApiOperation({ summary: 'Download a printable QR plaque PNG' })
  @ApiProduces('image/png')
  @ApiOkResponse({
    description: 'PNG image bytes.',
    content: { 'image/png': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiResourceNotFound('Site')
  async getQrPng(@Param('slug') slug: string, @Res() res: Response): Promise<void> {
    const png = await this.qrService.generateSiteQrPng(slug);
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${slug}-plaque.png"`,
      'Cache-Control': 'public, max-age=3600',
    });
    res.send(png);
  }

  @Get(':slug')
  @ApiJsonOk('Get a public heritage site by slug', SITE_DETAIL_SCHEMA, SITE_DETAIL_EXAMPLE)
  @ApiResourceNotFound('Site')
  getBySlug(@Param('slug') slug: string): Promise<SiteDetail> {
    return this.sitesService.getPublicSiteBySlug(slug);
  }
}
