import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { LandingResponse, SiteDetail } from '@heritage/shared-types';
import { QrService } from '../../qr/application/qr.service';
import { SitesService } from '../application/sites.service';

@Controller('public/landing')
export class PublicLandingController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  getLanding(): Promise<LandingResponse> {
    return this.sitesService.getLanding();
  }
}

@Controller('public/sites')
export class PublicSitesController {
  constructor(
    private readonly sitesService: SitesService,
    private readonly qrService: QrService,
  ) {}

  @Get(':slug/qr.png')
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
  getBySlug(@Param('slug') slug: string): Promise<SiteDetail> {
    return this.sitesService.getPublicSiteBySlug(slug);
  }
}
