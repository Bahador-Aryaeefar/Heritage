import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  AdminSite,
  CityOption,
  CreateSiteAdminInput,
  PaginatedResponse,
  UpdateSiteAdminInput,
} from '@heritage/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE_SERVICE, type StorageService } from '../../storage/storage.interface';
import { MediaService } from '../../media/application/media.service';
import { handlePrismaError } from '../../common/filters/handle-prisma-error';
import { mapBlock } from './sites.mapper';
import {
  normalizePagination,
  paginatedResponse,
  type PaginationQueryDto,
} from '../../common/pagination/pagination';

const adminSiteSelect = {
  id: true,
  slug: true,
  category: true,
  lat: true,
  lng: true,
  isActive: true,
  city: {
    select: {
      id: true,
      slug: true,
      nameFa: true,
      nameEn: true,
      province: { select: { slug: true, nameFa: true, nameEn: true } },
    },
  },
  translations: {
    select: { locale: true, title: true, shortDescription: true },
  },
  media: {
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      type: true,
      url: true,
      embedUrl: true,
      altFa: true,
      altEn: true,
      contentHash: true,
      isCover: true,
    },
  },
  blocks: {
    orderBy: { sortOrder: 'asc' },
    include: { media: true },
  },
} as const;

type AdminSiteRow = Prisma.SiteGetPayload<{ select: typeof adminSiteSelect }>;

@Injectable()
export class AdminSitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async listSites(query: PaginationQueryDto): Promise<PaginatedResponse<AdminSite>> {
    const pagination = normalizePagination(query);
    const [sites, totalItems] = await this.prisma.$transaction([
      this.prisma.site.findMany({
        select: adminSiteSelect,
        orderBy: { createdAt: 'asc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.site.count(),
    ]);
    return paginatedResponse(
      sites.map((site) => this.mapAdminSite(site)),
      totalItems,
      pagination,
    );
  }

  async getSite(id: string): Promise<AdminSite> {
    const site = await this.prisma.site.findUnique({
      where: { id },
      select: adminSiteSelect,
    });
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    return this.mapAdminSite(site);
  }

  async createSite(input: CreateSiteAdminInput): Promise<AdminSite> {
    await this.requireCity(input.cityId);
    try {
      const site = await this.prisma.site.create({
        data: {
          slug: input.slug,
          category: input.category,
          lat: input.lat,
          lng: input.lng,
          cityId: input.cityId,
          isActive: input.isActive ?? true,
          translations: {
            create: input.translations.map((t) => ({
              locale: t.locale,
              title: t.title,
              shortDescription: t.shortDescription,
            })),
          },
        },
        select: adminSiteSelect,
      });
      return this.mapAdminSite(site);
    } catch (error) {
      handlePrismaError(error, 'Site');
    }
  }

  async updateSite(id: string, input: UpdateSiteAdminInput): Promise<AdminSite> {
    await this.requireSite(id);
    if (input.cityId) {
      await this.requireCity(input.cityId);
    }

    try {
      const site = await this.prisma.$transaction(async (tx) => {
        await tx.site.update({
          where: { id },
          data: {
            category: input.category,
            lat: input.lat,
            lng: input.lng,
            cityId: input.cityId,
            isActive: input.isActive,
          },
        });

        if (input.translations) {
          for (const translation of input.translations) {
            await tx.siteTranslation.upsert({
              where: { siteId_locale: { siteId: id, locale: translation.locale } },
              create: {
                siteId: id,
                locale: translation.locale,
                title: translation.title,
                shortDescription: translation.shortDescription,
              },
              update: {
                title: translation.title,
                shortDescription: translation.shortDescription,
              },
            });
          }
        }

        return tx.site.findUniqueOrThrow({ where: { id }, select: adminSiteSelect });
      });

      return this.mapAdminSite(site);
    } catch (error) {
      handlePrismaError(error, 'Site');
    }
  }

  async uploadCover(id: string, file: Express.Multer.File): Promise<AdminSite> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Cover image file is required');
    }

    await this.requireSite(id);
    await this.mediaService.saveImageFromBuffer(id, file.buffer, 'cover', {
      isCover: true,
      altFa: 'تصویر کاور',
      altEn: 'Cover image',
    });

    return this.getSite(id);
  }

  async listCities(query: PaginationQueryDto): Promise<PaginatedResponse<CityOption>> {
    const pagination = normalizePagination(query);
    const [cities, totalItems] = await this.prisma.$transaction([
      this.prisma.city.findMany({
        select: {
          id: true,
          slug: true,
          nameFa: true,
          nameEn: true,
          province: { select: { slug: true, nameFa: true, nameEn: true } },
        },
        orderBy: [{ province: { nameFa: 'asc' } }, { nameFa: 'asc' }],
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.city.count(),
    ]);

    return paginatedResponse(
      cities.map((city) => ({
        id: city.id,
        slug: city.slug,
        nameFa: city.nameFa,
        nameEn: city.nameEn,
        province: city.province,
      })),
      totalItems,
      pagination,
    );
  }

  private async requireSite(id: string): Promise<void> {
    const site = await this.prisma.site.findUnique({ where: { id }, select: { id: true } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }
  }

  private async requireCity(cityId: string): Promise<void> {
    const city = await this.prisma.city.findUnique({ where: { id: cityId }, select: { id: true } });
    if (!city) {
      throw new NotFoundException('City not found');
    }
  }

  private mapAdminSite(site: AdminSiteRow): AdminSite {
    const toAbsoluteUrl = (url: string) => this.storage.toAbsoluteUrl(url);
    const coverMedia = site.media.find((m) => m.isCover);
    const coverUrl = coverMedia?.url ? toAbsoluteUrl(coverMedia.url) : null;

    const blocksByLocale = new Map<string, AdminSiteRow['blocks']>();
    for (const block of site.blocks) {
      const list = blocksByLocale.get(block.locale) ?? [];
      list.push(block);
      blocksByLocale.set(block.locale, list);
    }

    return {
      id: site.id,
      slug: site.slug,
      category: site.category,
      lat: site.lat.toString(),
      lng: site.lng.toString(),
      isActive: site.isActive,
      city: {
        id: site.city.id,
        slug: site.city.slug,
        nameFa: site.city.nameFa,
        nameEn: site.city.nameEn,
      },
      province: site.city.province,
      translations: site.translations.map((t) => ({
        locale: t.locale as AdminSite['translations'][number]['locale'],
        title: t.title,
        shortDescription: t.shortDescription,
        blocks: (blocksByLocale.get(t.locale) ?? []).map((b) => mapBlock(b, toAbsoluteUrl)),
      })),
      media: site.media.map((m) => ({
        id: m.id,
        type: m.type,
        url: m.url ? toAbsoluteUrl(m.url) : null,
        embedUrl: m.embedUrl,
        altFa: m.altFa,
        altEn: m.altEn,
        contentHash: m.contentHash,
        isCover: m.isCover,
      })),
      coverUrl,
    };
  }
}
