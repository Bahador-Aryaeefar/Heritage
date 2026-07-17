import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { LandingResponse, SiteDetail } from '@heritage/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE_SERVICE, type StorageService } from '../../storage/storage.interface';
import {
  mapSiteCard,
  mapSiteDetail,
  parseLandingResponse,
  parseSiteDetail,
  siteCardSelect,
  siteDetailSelect,
} from './sites.mapper';

@Injectable()
export class SitesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async getLanding(): Promise<LandingResponse> {
    const sites = await this.prisma.site.findMany({
      where: { isActive: true },
      select: siteCardSelect,
      orderBy: { createdAt: 'asc' },
    });

    const mapped = {
      sites: sites.map((site) => mapSiteCard(site, (url) => this.storage.toAbsoluteUrl(url))),
    };
    return parseLandingResponse(mapped);
  }

  async getPublicSiteBySlug(slug: string): Promise<SiteDetail> {
    const site = await this.prisma.site.findUnique({
      where: { slug },
      select: siteDetailSelect,
    });

    if (!site || !site.isActive) {
      throw new NotFoundException('Site not found');
    }

    const mapped = mapSiteDetail(site, (url) => this.storage.toAbsoluteUrl(url));
    return parseSiteDetail(mapped);
  }
}
