import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaType, Prisma } from '@prisma/client';
import type {
  AdminBlockWrite,
  AdminSite,
  CityOption,
  CreateSiteFullInput,
  PaginatedResponse,
  UpdateSiteFullInput,
} from '@heritage/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE_SERVICE, type StorageService } from '../../storage/storage.interface';
import { MediaCleanupService } from '../../media/application/media-cleanup.service';
import { StagingService, type StagingSession } from '../../storage/staging.service';
import { sha256Hex } from '../../common/crypto/sha256';
import { AUDIO_MAX_BYTES, IMAGE_MAX_BYTES } from '../../storage/upload-limits';
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

// --- Media resolution (pure, unit-tested) ---

export interface PreparedFile {
  clientFileKey: string;
  kind: 'IMAGE' | 'AUDIO';
  buffer: Buffer;
  contentHash: string;
  mimeType: string;
  extension: string;
}

export interface ExistingMediaRef {
  id: string;
  contentHash: string | null;
  embedUrl: string | null;
}

export interface NewMediaSpec {
  type: MediaType;
  contentHash: string | null;
  embedUrl: string | null;
  mimeType: string | null;
  clientFileKey?: string;
}

/** How a payload media reference maps onto the persisted graph. */
export interface MediaResolution {
  existingId?: string;
  newIndex?: number;
}

/**
 * Resolves payload media references (existing `mediaId`, content-hash reuse of
 * media already on the site, or brand-new uploads/embeds) into either an
 * existing media id or an index into a fresh `newMedia` list. Deduplicates by
 * content hash (files) and embed URL (video) so identical inputs map to one row.
 */
export class MediaPlanner {
  readonly newMedia: NewMediaSpec[] = [];
  private readonly existingIds = new Set<string>();
  private readonly existingByHash = new Map<string, string>();
  private readonly existingByEmbed = new Map<string, string>();
  private readonly newByClientKey = new Map<string, number>();
  private readonly newByEmbed = new Map<string, number>();

  constructor(existing: ExistingMediaRef[], private readonly prepared: Map<string, PreparedFile>) {
    for (const media of existing) {
      this.existingIds.add(media.id);
      if (media.contentHash) this.existingByHash.set(media.contentHash, media.id);
      if (media.embedUrl) this.existingByEmbed.set(media.embedUrl, media.id);
    }
  }

  resolveFile(ref: { mediaId?: string | null; clientFileKey?: string | null }): MediaResolution {
    if (ref.mediaId) {
      this.assertExisting(ref.mediaId);
      return { existingId: ref.mediaId };
    }
    const key = ref.clientFileKey;
    if (!key) {
      throw new BadRequestException('Media reference requires mediaId or clientFileKey');
    }
    const file = this.prepared.get(key);
    if (!file) {
      throw new BadRequestException(`No uploaded file for key: ${key}`);
    }

    const reuseId = this.existingByHash.get(file.contentHash);
    if (reuseId) return { existingId: reuseId };

    const dedupeIndex = this.newByClientKey.get(key);
    if (dedupeIndex !== undefined) return { newIndex: dedupeIndex };

    const index =
      this.newMedia.push({
        type: file.kind,
        contentHash: file.contentHash,
        embedUrl: null,
        mimeType: file.mimeType,
        clientFileKey: key,
      }) - 1;
    this.newByClientKey.set(key, index);
    return { newIndex: index };
  }

  resolveVideo(ref: { mediaId?: string | null; embedUrl: string }): MediaResolution {
    if (ref.mediaId) {
      this.assertExisting(ref.mediaId);
      return { existingId: ref.mediaId };
    }

    const reuseId = this.existingByEmbed.get(ref.embedUrl);
    if (reuseId) return { existingId: reuseId };

    const dedupeIndex = this.newByEmbed.get(ref.embedUrl);
    if (dedupeIndex !== undefined) return { newIndex: dedupeIndex };

    const index =
      this.newMedia.push({
        type: MediaType.VIDEO,
        contentHash: null,
        embedUrl: ref.embedUrl,
        mimeType: null,
      }) - 1;
    this.newByEmbed.set(ref.embedUrl, index);
    return { newIndex: index };
  }

  private assertExisting(mediaId: string): void {
    if (!this.existingIds.has(mediaId)) {
      throw new BadRequestException(`mediaId ${mediaId} does not belong to this site`);
    }
  }
}

const ALLOWED_AUDIO_MIME = new Map<string, string>([
  ['audio/mpeg', 'mp3'],
  ['audio/webm', 'weba'],
  ['audio/ogg', 'ogg'],
  ['audio/wav', 'wav'],
]);

type FileMap = Record<string, Express.Multer.File>;
type FullPayload = CreateSiteFullInput | UpdateSiteFullInput;

interface ResolvedPlan {
  planner: MediaPlanner;
  cover: MediaResolution | null;
  blocks: Map<string, MediaResolution>;
}

@Injectable()
export class AdminSitesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly staging: StagingService,
    private readonly cleanup: MediaCleanupService,
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

  async createSiteFull(payload: CreateSiteFullInput, files: FileMap): Promise<AdminSite> {
    await this.requireCity(payload.cityId);
    const prepared = this.prepareFiles(payload, files);
    const plan = this.resolvePlan([], payload, prepared);

    const session = this.staging.createSession();
    try {
      await this.stageImages(session, prepared);

      const { siteId, createdMediaIds } = await this.prisma.$transaction(async (tx) => {
        const site = await tx.site.create({
          data: {
            slug: payload.slug,
            category: payload.category,
            lat: payload.lat,
            lng: payload.lng,
            cityId: payload.cityId,
            isActive: payload.isActive ?? true,
            translations: {
              create: payload.translations.map((t) => ({
                locale: t.locale,
                title: t.title,
                shortDescription: t.shortDescription,
              })),
            },
          },
        });
        const createdMediaIds = await this.persistMediaAndBlocks(tx, site.id, payload, plan);
        return { siteId: site.id, createdMediaIds };
      });

      await this.promoteNewMedia(session, siteId, plan.planner.newMedia, createdMediaIds, prepared);
      await this.staging.cleanup(session.sessionId);
      return this.getSite(siteId);
    } catch (error) {
      await this.staging.abort(session.sessionId);
      handlePrismaError(error, 'Site');
    }
  }

  async replaceSiteFull(
    id: string,
    payload: UpdateSiteFullInput,
    files: FileMap,
  ): Promise<AdminSite> {
    await this.requireCity(payload.cityId);
    const existing = await this.prisma.site.findUnique({
      where: { id },
      select: { id: true, media: { select: { id: true, contentHash: true, embedUrl: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Site not found');
    }

    const prepared = this.prepareFiles(payload, files);
    const plan = this.resolvePlan(existing.media, payload, prepared);

    const session = this.staging.createSession();
    try {
      await this.stageImages(session, prepared);

      const createdMediaIds = await this.prisma.$transaction(async (tx) => {
        await tx.site.update({
          where: { id },
          data: {
            category: payload.category,
            lat: payload.lat,
            lng: payload.lng,
            cityId: payload.cityId,
            isActive: payload.isActive,
          },
        });

        for (const translation of payload.translations) {
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

        return this.persistMediaAndBlocks(tx, id, payload, plan);
      });

      await this.promoteNewMedia(session, id, plan.planner.newMedia, createdMediaIds, prepared);
      await this.staging.cleanup(session.sessionId);
      await this.cleanup.deleteUnusedMediaForSite(id);
      return this.getSite(id);
    } catch (error) {
      await this.staging.abort(session.sessionId);
      handlePrismaError(error, 'Site');
    }
  }

  async deleteSite(id: string): Promise<void> {
    await this.requireSite(id);
    // Collect + remove disk files while media rows still exist, then cascade the
    // DB delete. QRCode/VisitEvent have onDelete: Restrict on Site, so they must
    // be removed before the site row.
    await this.cleanup.deleteAllMediaFilesForSite(id);
    try {
      await this.prisma.$transaction([
        this.prisma.visitEvent.deleteMany({ where: { siteId: id } }),
        this.prisma.qRCode.deleteMany({ where: { siteId: id } }),
        this.prisma.site.delete({ where: { id } }),
      ]);
    } catch (error) {
      handlePrismaError(error, 'Site');
    }
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

  // --- Full-write helpers ---

  /** Validate every referenced upload exists and passes size/mime caps; hash the original bytes. */
  private prepareFiles(payload: FullPayload, files: FileMap): Map<string, PreparedFile> {
    const kinds = new Map<string, 'IMAGE' | 'AUDIO'>();
    const note = (key: string | null | undefined, kind: 'IMAGE' | 'AUDIO') => {
      if (!key) return;
      const previous = kinds.get(key);
      if (previous && previous !== kind) {
        throw new BadRequestException(`File "${key}" is referenced as both ${previous} and ${kind}`);
      }
      kinds.set(key, kind);
    };

    if (payload.cover?.clientFileKey) note(payload.cover.clientFileKey, 'IMAGE');
    for (const translation of payload.translations) {
      const blocks: AdminBlockWrite[] = translation.blocks;
      for (const block of blocks) {
        if (block.type === 'IMAGE') note(block.clientFileKey, 'IMAGE');
        if (block.type === 'AUDIO') note(block.clientFileKey, 'AUDIO');
      }
    }

    const prepared = new Map<string, PreparedFile>();
    for (const [key, kind] of kinds) {
      const file = files[key];
      if (!file?.buffer?.length) {
        throw new BadRequestException(`Missing uploaded file for key: ${key}`);
      }
      const size = file.size ?? file.buffer.length;

      if (kind === 'IMAGE') {
        if (size > IMAGE_MAX_BYTES) {
          throw new BadRequestException(`Image "${key}" exceeds the maximum allowed size`);
        }
        if (!file.mimetype?.startsWith('image/')) {
          throw new BadRequestException(`File "${key}" must be an image`);
        }
        prepared.set(key, {
          clientFileKey: key,
          kind,
          buffer: file.buffer,
          contentHash: sha256Hex(file.buffer),
          mimeType: file.mimetype,
          extension: 'webp',
        });
      } else {
        if (size > AUDIO_MAX_BYTES) {
          throw new BadRequestException(`Audio "${key}" exceeds the maximum allowed size`);
        }
        const extension = ALLOWED_AUDIO_MIME.get(file.mimetype);
        if (!extension) {
          throw new BadRequestException(`Unsupported audio type for "${key}": ${file.mimetype}`);
        }
        prepared.set(key, {
          clientFileKey: key,
          kind,
          buffer: file.buffer,
          contentHash: sha256Hex(file.buffer),
          mimeType: file.mimetype,
          extension,
        });
      }
    }

    return prepared;
  }

  /** Resolve cover + every block media reference against existing site media + staged files. */
  private resolvePlan(
    existingMedia: ExistingMediaRef[],
    payload: FullPayload,
    prepared: Map<string, PreparedFile>,
  ): ResolvedPlan {
    const planner = new MediaPlanner(existingMedia, prepared);
    const cover = payload.cover ? planner.resolveFile(payload.cover) : null;
    const blocks = new Map<string, MediaResolution>();

    for (const translation of payload.translations) {
      const translationBlocks: AdminBlockWrite[] = translation.blocks;
      translationBlocks.forEach((block, index) => {
        const blockKey = this.blockKey(translation.locale, index);
        if (block.type === 'IMAGE' || block.type === 'AUDIO') {
          blocks.set(blockKey, planner.resolveFile(block));
        } else if (block.type === 'VIDEO') {
          blocks.set(blockKey, planner.resolveVideo(block));
        }
      });
    }

    return { planner, cover, blocks };
  }

  private async stageImages(
    session: StagingSession,
    prepared: Map<string, PreparedFile>,
  ): Promise<void> {
    for (const file of prepared.values()) {
      if (file.kind === 'IMAGE') {
        await this.staging.write(session.sessionId, this.stagedName(file.clientFileKey), file.buffer);
      }
    }
  }

  /** Create new media rows, rewrite the block graph, and set the single cover. Returns new media ids by index. */
  private async persistMediaAndBlocks(
    tx: Prisma.TransactionClient,
    siteId: string,
    payload: FullPayload,
    plan: ResolvedPlan,
  ): Promise<string[]> {
    const createdMediaIds: string[] = [];
    for (let index = 0; index < plan.planner.newMedia.length; index += 1) {
      const spec = plan.planner.newMedia[index];
      const media = await tx.media.create({
        data: {
          siteId,
          type: spec.type,
          url: null,
          embedUrl: spec.embedUrl,
          mimeType: spec.mimeType,
          contentHash: spec.contentHash,
          sortOrder: index,
        },
      });
      createdMediaIds.push(media.id);
    }

    const idOf = (resolution: MediaResolution): string =>
      resolution.existingId ?? createdMediaIds[resolution.newIndex!];

    await tx.siteContentBlock.deleteMany({ where: { siteId } });

    const blockRows: Prisma.SiteContentBlockCreateManyInput[] = [];
    for (const translation of payload.translations) {
      const blocks: AdminBlockWrite[] = translation.blocks;
      blocks.forEach((block, index) => {
        if (block.type === 'IMAGE' || block.type === 'AUDIO' || block.type === 'VIDEO') {
          const resolution = plan.blocks.get(this.blockKey(translation.locale, index))!;
          blockRows.push({
            siteId,
            locale: translation.locale,
            sortOrder: index,
            type: block.type,
            mediaId: idOf(resolution),
            caption: block.caption ?? null,
          });
          return;
        }

        blockRows.push({
          siteId,
          locale: translation.locale,
          sortOrder: index,
          type: block.type,
          textRole: block.textRole,
          colorToken: block.colorToken,
          align: block.align,
          spans: [{ text: block.text }],
        });
      });
    }

    if (blockRows.length > 0) {
      await tx.siteContentBlock.createMany({ data: blockRows });
    }

    await tx.media.updateMany({ where: { siteId, isCover: true }, data: { isCover: false } });
    if (plan.cover) {
      await tx.media.update({ where: { id: idOf(plan.cover) }, data: { isCover: true } });
    }

    return createdMediaIds;
  }

  /** After the DB commit, move staged files to their final URLs and patch Media.url. */
  private async promoteNewMedia(
    session: StagingSession,
    siteId: string,
    newMedia: NewMediaSpec[],
    createdMediaIds: string[],
    prepared: Map<string, PreparedFile>,
  ): Promise<void> {
    for (let index = 0; index < newMedia.length; index += 1) {
      const spec = newMedia[index];
      if (!spec.clientFileKey) continue; // video / embed-only: nothing to promote
      const mediaId = createdMediaIds[index];
      const file = prepared.get(spec.clientFileKey)!;

      const stored =
        file.kind === 'IMAGE'
          ? await this.staging.promoteImage(
              session.sessionId,
              this.stagedName(file.clientFileKey),
              siteId,
              mediaId,
            )
          : await this.storage.saveBinary(siteId, 'audio', file.buffer, file.mimeType, file.extension);

      await this.prisma.media.update({
        where: { id: mediaId },
        data: { url: stored.url, mimeType: stored.mimeType },
      });
    }
  }

  private blockKey(locale: string, index: number): string {
    return `${locale}#${index}`;
  }

  /** Reject any client key that could escape the staging directory. */
  private stagedName(clientFileKey: string): string {
    if (
      !clientFileKey ||
      clientFileKey.includes('/') ||
      clientFileKey.includes('\\') ||
      clientFileKey.includes('..')
    ) {
      throw new BadRequestException(`Invalid file key: ${clientFileKey}`);
    }
    return clientFileKey;
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
