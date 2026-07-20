import { BadRequestException } from '@nestjs/common';
import type { CreateSiteFullInput, UpdateSiteFullInput } from '@heritage/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import type { StorageService } from '../../storage/storage.interface';
import { MediaCleanupService } from '../../media/application/media-cleanup.service';
import { StagingService } from '../../storage/staging.service';
import { AdminSitesService, MediaPlanner, type PreparedFile } from './admin-sites.service';

function preparedImage(clientFileKey: string, contentHash: string): PreparedFile {
  return {
    clientFileKey,
    kind: 'IMAGE',
    buffer: Buffer.from(contentHash),
    contentHash,
    mimeType: 'image/jpeg',
    extension: 'webp',
  };
}

describe('MediaPlanner', () => {
  it('reuses an existing site media row when the staged file hash matches', () => {
    const prepared = new Map<string, PreparedFile>([
      ['k1', preparedImage('k1', 'hash-A')],
    ]);
    const planner = new MediaPlanner(
      [{ id: 'media-existing', contentHash: 'hash-A', embedUrl: null }],
      prepared,
    );

    const resolution = planner.resolveFile({ clientFileKey: 'k1' });

    expect(resolution).toEqual({ existingId: 'media-existing' });
    expect(planner.newMedia).toHaveLength(0);
  });

  it('allocates a single new media entry and dedupes a repeated client file key', () => {
    const prepared = new Map<string, PreparedFile>([
      ['k1', preparedImage('k1', 'hash-new')],
    ]);
    const planner = new MediaPlanner([], prepared);

    const first = planner.resolveFile({ clientFileKey: 'k1' });
    const second = planner.resolveFile({ clientFileKey: 'k1' });

    expect(first).toEqual({ newIndex: 0 });
    expect(second).toEqual({ newIndex: 0 });
    expect(planner.newMedia).toHaveLength(1);
    expect(planner.newMedia[0]).toMatchObject({ type: 'IMAGE', contentHash: 'hash-new', clientFileKey: 'k1' });
  });

  it('reuses an existing embed-only video by embedUrl', () => {
    const planner = new MediaPlanner(
      [{ id: 'video-1', contentHash: null, embedUrl: 'https://aparat.com/v/abc' }],
      new Map(),
    );

    const resolution = planner.resolveVideo({ embedUrl: 'https://aparat.com/v/abc' });

    expect(resolution).toEqual({ existingId: 'video-1' });
    expect(planner.newMedia).toHaveLength(0);
  });

  it('rejects a mediaId that does not belong to the site', () => {
    const planner = new MediaPlanner([], new Map());

    expect(() => planner.resolveFile({ mediaId: 'foreign-media' })).toThrow(BadRequestException);
  });
});

function buildAdminRow(id: string) {
  return {
    id,
    slug: 'taq-e-bostan',
    category: 'ANCIENT',
    lat: '34.3872000',
    lng: '47.1332000',
    isActive: true,
    city: {
      id: 'city-1',
      slug: 'kermanshah',
      nameFa: 'کرمانشاه',
      nameEn: 'Kermanshah',
      province: { slug: 'kermanshah', nameFa: 'کرمانشاه', nameEn: 'Kermanshah' },
    },
    translations: [
      { locale: 'fa', title: 'طاق بستان', shortDescription: 'کوتاه' },
      { locale: 'en', title: 'Taq-e Bostan', shortDescription: 'short' },
    ],
    media: [],
    blocks: [],
  };
}

const faEnTranslations = [
  { locale: 'fa' as const, title: 'طاق بستان', shortDescription: 'کوتاه', blocks: [] },
  { locale: 'en' as const, title: 'Taq-e Bostan', shortDescription: 'short', blocks: [] },
];

function createTx() {
  return {
    site: { create: jest.fn(), update: jest.fn() },
    siteTranslation: { upsert: jest.fn() },
    media: { create: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
    siteContentBlock: { deleteMany: jest.fn(), createMany: jest.fn() },
  };
}
type TxMock = ReturnType<typeof createTx>;

function createPrisma(tx: TxMock) {
  return {
    city: { findUnique: jest.fn().mockResolvedValue({ id: 'city-1' }) },
    site: { findUnique: jest.fn(), delete: jest.fn() },
    media: { update: jest.fn() },
    visitEvent: { deleteMany: jest.fn() },
    qRCode: { deleteMany: jest.fn() },
    $transaction: jest.fn(
      (arg: unknown[] | ((client: TxMock) => unknown)): Promise<unknown> =>
        Array.isArray(arg) ? Promise.all(arg) : Promise.resolve(arg(tx)),
    ),
  };
}
type PrismaMock = ReturnType<typeof createPrisma>;

describe('AdminSitesService full write', () => {
  let prisma: PrismaMock;
  let tx: TxMock;
  let storage: jest.Mocked<StorageService>;
  let staging: jest.Mocked<
    Pick<StagingService, 'createSession' | 'write' | 'stageImage' | 'promoteImage' | 'abort' | 'cleanup'>
  >;
  let cleanup: jest.Mocked<Pick<MediaCleanupService, 'deleteUnusedMediaForSite' | 'deleteAllMediaFilesForSite'>>;
  let service: AdminSitesService;

  beforeEach(() => {
    tx = createTx();
    prisma = createPrisma(tx);
    storage = {
      processImage: jest.fn(),
      saveProcessedImage: jest.fn(),
      saveImage: jest.fn(),
      saveBinary: jest.fn(),
      deleteByUrl: jest.fn(),
      toAbsoluteUrl: jest.fn((url: string) => `http://localhost:4000${url}`),
    };
    staging = {
      createSession: jest.fn().mockReturnValue({ sessionId: 'session-1', dir: '/tmp/session-1' }),
      write: jest.fn(),
      stageImage: jest.fn(),
      promoteImage: jest.fn(),
      abort: jest.fn(),
      cleanup: jest.fn(),
    };
    cleanup = {
      deleteUnusedMediaForSite: jest.fn().mockResolvedValue(0),
      deleteAllMediaFilesForSite: jest.fn().mockResolvedValue(undefined),
    };

    service = new AdminSitesService(
      prisma as unknown as PrismaService,
      storage,
      staging as unknown as StagingService,
      cleanup as unknown as MediaCleanupService,
    );
  });

  it('runs unused-media cleanup after a successful replace', async () => {
    prisma.site.findUnique
      .mockResolvedValueOnce({ id: 'site-1', media: [] })
      .mockResolvedValueOnce(buildAdminRow('site-1'));

    const payload: UpdateSiteFullInput = {
      category: 'ANCIENT',
      lat: '34.3872000',
      lng: '47.1332000',
      cityId: 'city-1',
      isActive: true,
      translations: faEnTranslations,
    };

    await service.replaceSiteFull('site-1', payload, {});

    expect(cleanup.deleteUnusedMediaForSite).toHaveBeenCalledWith('site-1');
    expect(staging.cleanup).toHaveBeenCalledWith('session-1');
    expect(staging.abort).not.toHaveBeenCalled();
    expect(tx.siteContentBlock.deleteMany).toHaveBeenCalledWith({ where: { siteId: 'site-1' } });
  });

  it('aborts the staging session and does not clean up when the write throws', async () => {
    prisma.site.findUnique.mockResolvedValueOnce({ id: 'site-1', media: [] });
    prisma.$transaction.mockRejectedValueOnce(new Error('db down'));

    const payload: UpdateSiteFullInput = {
      category: 'ANCIENT',
      lat: '1',
      lng: '2',
      cityId: 'city-1',
      isActive: true,
      translations: faEnTranslations,
    };

    await expect(service.replaceSiteFull('site-1', payload, {})).rejects.toThrow('db down');
    expect(staging.abort).toHaveBeenCalledWith('session-1');
    expect(cleanup.deleteUnusedMediaForSite).not.toHaveBeenCalled();
  });

  it('creates a site with a new image block and promotes the staged file', async () => {
    tx.site.create.mockResolvedValue({ id: 'site-new' });
    tx.media.create.mockResolvedValue({ id: 'media-new' });
    staging.promoteImage.mockResolvedValue({ url: '/uploads/sites/site-new/images/media-new.webp', mimeType: 'image/webp' });
    prisma.site.findUnique.mockResolvedValue(buildAdminRow('site-new'));

    const payload: CreateSiteFullInput = {
      slug: 'taq-e-bostan',
      category: 'ANCIENT',
      lat: '34.3872000',
      lng: '47.1332000',
      cityId: 'city-1',
      cover: { clientFileKey: 'cover-key' },
      translations: [
        {
          locale: 'fa',
          title: 'طاق بستان',
          shortDescription: 'کوتاه',
          blocks: [{ type: 'IMAGE', clientFileKey: 'img-key', caption: null }],
        },
        { locale: 'en', title: 'Taq-e Bostan', shortDescription: 'short', blocks: [] },
      ],
    };
    const files = {
      'cover-key': { buffer: Buffer.from('cover-bytes'), size: 11, mimetype: 'image/jpeg' } as Express.Multer.File,
      'img-key': { buffer: Buffer.from('img-bytes'), size: 9, mimetype: 'image/png' } as Express.Multer.File,
    };

    await service.createSiteFull(payload, files);

    expect(staging.stageImage).toHaveBeenCalledTimes(2);
    expect(tx.media.create).toHaveBeenCalledTimes(2);
    expect(tx.siteContentBlock.createMany).toHaveBeenCalled();
    expect(staging.promoteImage).toHaveBeenCalled();
    expect(prisma.media.update).toHaveBeenCalled();
    expect(cleanup.deleteUnusedMediaForSite).not.toHaveBeenCalled();
  });

  it('aborts staging and never opens the transaction when an image fails to decode', async () => {
    staging.stageImage.mockRejectedValueOnce(new Error('Input buffer contains unsupported image format'));

    const payload: CreateSiteFullInput = {
      slug: 'taq-e-bostan',
      category: 'ANCIENT',
      lat: '34.3872000',
      lng: '47.1332000',
      cityId: 'city-1',
      cover: { clientFileKey: 'cover-key' },
      translations: faEnTranslations,
    };
    const files = {
      'cover-key': { buffer: Buffer.from('not-an-image'), size: 12, mimetype: 'image/png' } as Express.Multer.File,
    };

    await expect(service.createSiteFull(payload, files)).rejects.toBeInstanceOf(BadRequestException);

    expect(staging.abort).toHaveBeenCalledWith('session-1');
    expect(tx.site.create).not.toHaveBeenCalled();
    expect(tx.media.create).not.toHaveBeenCalled();
    expect(staging.promoteImage).not.toHaveBeenCalled();
  });

  it('deletes visit events and QR codes before the site, and removes media files first', async () => {
    prisma.site.findUnique.mockResolvedValue({ id: 'site-1' });

    await service.deleteSite('site-1');

    expect(cleanup.deleteAllMediaFilesForSite).toHaveBeenCalledWith('site-1');
    expect(prisma.visitEvent.deleteMany).toHaveBeenCalledWith({ where: { siteId: 'site-1' } });
    expect(prisma.qRCode.deleteMany).toHaveBeenCalledWith({ where: { siteId: 'site-1' } });
    expect(prisma.site.delete).toHaveBeenCalledWith({ where: { id: 'site-1' } });

    const filesOrder = cleanup.deleteAllMediaFilesForSite.mock.invocationCallOrder[0];
    const deleteOrder = prisma.site.delete.mock.invocationCallOrder[0];
    expect(filesOrder).toBeLessThan(deleteOrder);
  });
});
