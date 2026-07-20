import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE_SERVICE, type StorageService } from '../../storage/storage.interface';

@Injectable()
export class MediaCleanupService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  /** Delete non-cover Media rows with no remaining block references, and their disk files. */
  async deleteUnusedMediaForSite(siteId: string): Promise<number> {
    const unused = await this.prisma.media.findMany({
      where: {
        siteId,
        isCover: false,
        blocks: { none: {} },
      },
    });

    for (const media of unused) {
      await this.prisma.media.delete({ where: { id: media.id } });
      if (media.url) {
        await this.storage.deleteByUrl(media.url);
      }
    }

    return unused.length;
  }

  /** Delete disk files for every Media row of a site. Does not touch the DB — callers are responsible for row deletion (e.g. via `site.delete` cascade). */
  async deleteAllMediaFilesForSite(siteId: string): Promise<void> {
    const media = await this.prisma.media.findMany({
      where: { siteId },
      select: { url: true },
    });

    for (const m of media) {
      if (m.url) {
        await this.storage.deleteByUrl(m.url);
      }
    }
  }
}
