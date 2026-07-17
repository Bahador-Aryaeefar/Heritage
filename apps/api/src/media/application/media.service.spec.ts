import { BadRequestException } from '@nestjs/common';
import { ContentBlockType, MediaType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from './media.service';

describe('MediaService', () => {
  const prisma = {
    media: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const storage = {
    saveImage: jest.fn(),
    saveBinary: jest.fn(),
    deleteByUrl: jest.fn(),
    toAbsoluteUrl: jest.fn(),
  };

  let service: MediaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MediaService(prisma as unknown as PrismaService, storage);
  });

  it('rejects non-image cover flag', async () => {
    await expect(
      service.createMedia({
        siteId: 'site-1',
        type: MediaType.AUDIO,
        url: '/uploads/x.wav',
        isCover: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removes a stored file when createMedia fails after saveImageFromBuffer', async () => {
    storage.saveImage.mockResolvedValue({
      url: '/uploads/sites/site-1/images/cover.webp',
      mimeType: 'image/webp',
    });
    prisma.media.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.saveImageFromBuffer('site-1', Buffer.from('x'), 'cover'),
    ).rejects.toThrow('db down');

    expect(storage.deleteByUrl).toHaveBeenCalledWith('/uploads/sites/site-1/images/cover.webp');
    expect(prisma.media.create).toHaveBeenCalled();
  });

  it('removes the new file when replaceImageFromBuffer fails to update the row', async () => {
    prisma.media.findUnique.mockResolvedValue({
      id: 'media-1',
      siteId: 'site-1',
      type: MediaType.IMAGE,
      url: '/uploads/sites/site-1/images/old.webp',
    });
    storage.saveImage.mockResolvedValue({
      url: '/uploads/sites/site-1/images/new.webp',
      mimeType: 'image/webp',
    });
    prisma.media.update.mockRejectedValue(new Error('db down'));

    await expect(
      service.replaceImageFromBuffer('media-1', Buffer.from('x'), 'new'),
    ).rejects.toThrow('db down');

    expect(storage.deleteByUrl).toHaveBeenCalledWith('/uploads/sites/site-1/images/new.webp');
    expect(storage.deleteByUrl).not.toHaveBeenCalledWith('/uploads/sites/site-1/images/old.webp');
  });

  it('drops the previous file only after a successful replace', async () => {
    prisma.media.findUnique.mockResolvedValue({
      id: 'media-1',
      siteId: 'site-1',
      type: MediaType.IMAGE,
      url: '/uploads/sites/site-1/images/old.webp',
    });
    storage.saveImage.mockResolvedValue({
      url: '/uploads/sites/site-1/images/new.webp',
      mimeType: 'image/webp',
    });
    prisma.media.update.mockResolvedValue({
      id: 'media-1',
      url: '/uploads/sites/site-1/images/new.webp',
    });

    await service.replaceImageFromBuffer('media-1', Buffer.from('x'), 'new');

    expect(storage.deleteByUrl).toHaveBeenCalledWith('/uploads/sites/site-1/images/old.webp');
    expect(storage.deleteByUrl).not.toHaveBeenCalledWith('/uploads/sites/site-1/images/new.webp');
  });

  it('requires spans on text blocks', () => {
    expect(() =>
      service.validateBlockInput({
        siteId: 'site-1',
        locale: 'fa',
        sortOrder: 0,
        type: ContentBlockType.HEADING,
        textRole: 'HERO',
        colorToken: 'BROWN_800',
        align: 'START',
        spans: [],
      }),
    ).toThrow(BadRequestException);
  });

  it('requires mediaId on media blocks', () => {
    expect(() =>
      service.validateBlockInput({
        siteId: 'site-1',
        locale: 'fa',
        sortOrder: 1,
        type: ContentBlockType.IMAGE,
      }),
    ).toThrow(BadRequestException);
  });
});
