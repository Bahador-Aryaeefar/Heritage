import { PrismaService } from '../../prisma/prisma.service';
import type { StorageService } from '../../storage/storage.interface';
import { MediaCleanupService } from './media-cleanup.service';

describe('MediaCleanupService', () => {
  const prisma = {
    media: {
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };
  const deleteByUrl = jest.fn();
  const storage: jest.Mocked<StorageService> = {
    processImage: jest.fn(),
    saveProcessedImage: jest.fn(),
    saveImage: jest.fn(),
    saveBinary: jest.fn(),
    deleteByUrl,
    toAbsoluteUrl: jest.fn(),
  };

  let service: MediaCleanupService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MediaCleanupService(prisma as unknown as PrismaService, storage);
  });

  describe('deleteUnusedMediaForSite', () => {
    it('queries for non-cover media with no blocks, deletes rows and disk files, returns count', async () => {
      prisma.media.findMany.mockResolvedValue([
        { id: 'media-1', url: '/uploads/sites/site-1/images/a.webp' },
        { id: 'media-2', url: '/uploads/sites/site-1/audio/b.mp3' },
      ]);

      const count = await service.deleteUnusedMediaForSite('site-1');

      expect(prisma.media.findMany).toHaveBeenCalledWith({
        where: {
          siteId: 'site-1',
          isCover: false,
          blocks: { none: {} },
        },
      });
      expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: 'media-1' } });
      expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: 'media-2' } });
      expect(deleteByUrl).toHaveBeenCalledWith('/uploads/sites/site-1/images/a.webp');
      expect(deleteByUrl).toHaveBeenCalledWith('/uploads/sites/site-1/audio/b.mp3');
      expect(count).toBe(2);
    });

    it('skips disk deletion for rows with no url (e.g. embed-only video)', async () => {
      prisma.media.findMany.mockResolvedValue([{ id: 'media-3', url: null }]);

      const count = await service.deleteUnusedMediaForSite('site-1');

      expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: 'media-3' } });
      expect(deleteByUrl).not.toHaveBeenCalled();
      expect(count).toBe(1);
    });

    it('does nothing when there is no unused media (referenced or cover rows are excluded by the query)', async () => {
      prisma.media.findMany.mockResolvedValue([]);

      const count = await service.deleteUnusedMediaForSite('site-1');

      expect(prisma.media.delete).not.toHaveBeenCalled();
      expect(deleteByUrl).not.toHaveBeenCalled();
      expect(count).toBe(0);
    });
  });

  describe('deleteAllMediaFilesForSite', () => {
    it('loads every media url for the site and deletes each disk file, without touching the DB', async () => {
      prisma.media.findMany.mockResolvedValue([
        { url: '/uploads/sites/site-1/images/cover.webp' },
        { url: '/uploads/sites/site-1/audio/track.mp3' },
        { url: null },
      ]);

      await service.deleteAllMediaFilesForSite('site-1');

      expect(prisma.media.findMany).toHaveBeenCalledWith({
        where: { siteId: 'site-1' },
        select: { url: true },
      });
      expect(deleteByUrl).toHaveBeenCalledTimes(2);
      expect(deleteByUrl).toHaveBeenCalledWith('/uploads/sites/site-1/images/cover.webp');
      expect(deleteByUrl).toHaveBeenCalledWith('/uploads/sites/site-1/audio/track.mp3');
      expect(prisma.media.delete).not.toHaveBeenCalled();
    });
  });
});
