import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  BlockAlign,
  ColorToken,
  ContentBlockType,
  Media,
  MediaType,
  TextRole,
} from '@prisma/client';
import { validateMediaBlockType, validateTextBlockFields } from '@heritage/shared-types';
import { ZodError } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE_SERVICE, type StorageService, type StoredFile } from '../../storage/storage.interface';
import { handlePrismaError } from '../../common/filters/handle-prisma-error';

export interface CreateMediaInput {
  siteId: string;
  type: MediaType;
  url?: string | null;
  embedUrl?: string | null;
  mimeType?: string | null;
  durationSec?: number | null;
  sortOrder?: number;
  isCover?: boolean;
}

export interface CreateBlockInput {
  siteId: string;
  locale: string;
  sortOrder: number;
  type: ContentBlockType;
  textRole?: TextRole | null;
  colorToken?: ColorToken | null;
  align?: BlockAlign | null;
  spans?: unknown;
  mediaId?: string | null;
  caption?: string | null;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async createMedia(input: CreateMediaInput) {
    this.assertMediaSource(input);

    if (input.isCover) {
      if (input.type !== MediaType.IMAGE) {
        throw new BadRequestException('Only images can be marked as cover');
      }
      await this.prisma.media.updateMany({
        where: { siteId: input.siteId, isCover: true },
        data: { isCover: false },
      });
    }

    try {
      return await this.prisma.media.create({
        data: {
          siteId: input.siteId,
          type: input.type,
          url: input.url ?? null,
          embedUrl: input.embedUrl ?? null,
          mimeType: input.mimeType ?? null,
          durationSec: input.durationSec ?? null,
          sortOrder: input.sortOrder ?? 0,
          isCover: input.isCover ?? false,
        },
      });
    } catch (error) {
      handlePrismaError(error, 'Media');
    }
  }

  async saveImageFromBuffer(
    siteId: string,
    buffer: Buffer,
    filenameBase: string,
    options: Omit<CreateMediaInput, 'siteId' | 'type' | 'url' | 'mimeType'> = {},
  ): Promise<Media> {
    const stored = await this.storage.saveImage(siteId, buffer, filenameBase);
    return this.createMediaAfterLocalStore(stored, {
      siteId,
      type: MediaType.IMAGE,
      ...options,
    });
  }

  async saveAudioFromBuffer(
    siteId: string,
    buffer: Buffer,
    mimeType: string,
    extension: string,
    options: Omit<CreateMediaInput, 'siteId' | 'type' | 'url' | 'mimeType'> = {},
  ): Promise<Media> {
    const stored = await this.storage.saveBinary(siteId, 'audio', buffer, mimeType, extension);
    return this.createMediaAfterLocalStore(stored, {
      siteId,
      type: MediaType.AUDIO,
      ...options,
    });
  }

  async replaceImageFromBuffer(
    mediaId: string,
    buffer: Buffer,
    filenameBase: string,
  ): Promise<Media> {
    const existing = await this.requireLocalMedia(mediaId, MediaType.IMAGE);
    const stored = await this.storage.saveImage(existing.siteId, buffer, filenameBase);
    return this.replaceLocalMediaRecord(existing, stored);
  }

  async replaceAudioFromBuffer(
    mediaId: string,
    buffer: Buffer,
    mimeType: string,
    extension: string,
  ): Promise<Media> {
    const existing = await this.requireLocalMedia(mediaId, MediaType.AUDIO);
    const stored = await this.storage.saveBinary(
      existing.siteId,
      'audio',
      buffer,
      mimeType,
      extension,
    );
    return this.replaceLocalMediaRecord(existing, stored);
  }

  async deleteMedia(id: string): Promise<void> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) return;
    await this.prisma.media.delete({ where: { id } });
    if (media.url) {
      await this.storage.deleteByUrl(media.url);
    }
  }

  validateBlockInput(input: CreateBlockInput): void {
    const isText = input.type === ContentBlockType.HEADING || input.type === ContentBlockType.PARAGRAPH;
    const isMedia =
      input.type === ContentBlockType.IMAGE ||
      input.type === ContentBlockType.VIDEO ||
      input.type === ContentBlockType.AUDIO;

    if (isText) {
      if (!input.textRole || !input.colorToken || !input.align) {
        throw new BadRequestException('Text blocks require textRole, colorToken, and align');
      }
      try {
        validateTextBlockFields(input.type, input.spans);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new BadRequestException('Invalid text block spans');
        }
        throw error;
      }
      return;
    }

    if (isMedia) {
      validateMediaBlockType(input.type);
      if (!input.mediaId) {
        throw new BadRequestException('Media blocks require mediaId');
      }
      return;
    }

    throw new BadRequestException(`Unknown block type: ${input.type}`);
  }

  private assertMediaSource(input: CreateMediaInput): void {
    const hasUrl = Boolean(input.url);
    const hasEmbed = Boolean(input.embedUrl);

    if (input.type === MediaType.VIDEO) {
      if (!hasUrl && !hasEmbed) {
        throw new BadRequestException('Video media requires url or embedUrl');
      }
      return;
    }

    if (!hasUrl) {
      throw new BadRequestException(`${input.type} media requires url`);
    }
  }

  /** Persist a row after a file was written; remove the new file if the DB write fails. */
  private async createMediaAfterLocalStore(
    stored: StoredFile,
    input: CreateMediaInput,
  ): Promise<Media> {
    try {
      return await this.createMedia({
        ...input,
        url: stored.url,
        mimeType: stored.mimeType,
      });
    } catch (error) {
      await this.storage.deleteByUrl(stored.url);
      throw error;
    }
  }

  /** Point media at a new local file; remove the new file if the DB update fails, then drop the old file. */
  private async replaceLocalMediaRecord(existing: Media, stored: StoredFile): Promise<Media> {
    const previousUrl = existing.url;
    try {
      const updated = await this.prisma.media.update({
        where: { id: existing.id },
        data: {
          url: stored.url,
          mimeType: stored.mimeType,
          embedUrl: null,
        },
      });
      if (previousUrl && previousUrl !== stored.url) {
        await this.storage.deleteByUrl(previousUrl);
      }
      return updated;
    } catch (error) {
      await this.storage.deleteByUrl(stored.url);
      handlePrismaError(error, 'Media');
    }
  }

  private async requireLocalMedia(mediaId: string, type: MediaType): Promise<Media> {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media || media.type !== type) {
      throw new NotFoundException('Media not found');
    }
    if (!media.url) {
      throw new BadRequestException('Only locally stored media can be replaced');
    }
    return media;
  }
}
