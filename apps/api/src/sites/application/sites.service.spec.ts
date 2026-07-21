import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { StorageService } from '../../storage/storage.interface';
import { SitesService } from './sites.service';

describe('SitesService', () => {
  const prisma = {
    site: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const storage = {
    toAbsoluteUrl: (url: string) => `http://localhost:4000${url}`,
  };

  let service: SitesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SitesService(prisma as unknown as PrismaService, storage as unknown as StorageService);
  });

  it('returns 404 for inactive sites', async () => {
    prisma.site.findUnique.mockResolvedValue({
      slug: 'hidden',
      category: 'HISTORICAL',
      lat: '1',
      lng: '2',
      isActive: false,
      city: {
        slug: 'c',
        nameFa: 'c',
        nameEn: 'c',
        province: { slug: 'p', nameFa: 'p', nameEn: 'p' },
      },
      translations: [],
      blocks: [],
      media: [],
    });

    await expect(service.getPublicSiteBySlug('hidden')).rejects.toBeInstanceOf(NotFoundException);
  });
});
