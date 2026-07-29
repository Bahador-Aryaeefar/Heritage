import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { VisitEventsService } from './visit-events.service';

describe('VisitEventsService.recordVisit', () => {
  const prisma = {
    site: { findFirst: jest.fn(), findUnique: jest.fn() },
    qRCode: { findFirst: jest.fn(), findMany: jest.fn() },
    visitEvent: { create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  };

  let service: VisitEventsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VisitEventsService(prisma as unknown as PrismaService);
  });

  it('throws 404 for a missing or inactive site', async () => {
    prisma.site.findFirst.mockResolvedValue(null);
    await expect(service.recordVisit('nope', { source: 'WEB', locale: 'fa' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.visitEvent.create).not.toHaveBeenCalled();
  });

  it('attaches the active QR code id for a QR-sourced visit', async () => {
    prisma.site.findFirst.mockResolvedValue({ id: 'site1' });
    prisma.qRCode.findFirst.mockResolvedValue({ id: 'qr1' });

    await service.recordVisit('taq-e-bostan', { source: 'QR', locale: 'fa' }, 'Mozilla/5.0 (iPhone)');

    expect(prisma.visitEvent.create).toHaveBeenCalledWith({
      data: {
        siteId: 'site1',
        qrCodeId: 'qr1',
        locale: 'fa',
        source: 'QR',
        deviceType: 'mobile',
      },
    });
  });

  it('leaves qrCodeId undefined for a web-sourced visit', async () => {
    prisma.site.findFirst.mockResolvedValue({ id: 'site1' });

    await service.recordVisit('taq-e-bostan', { source: 'WEB', locale: 'en' });

    expect(prisma.qRCode.findFirst).not.toHaveBeenCalled();
    expect(prisma.visitEvent.create).toHaveBeenCalledWith({
      data: {
        siteId: 'site1',
        qrCodeId: undefined,
        locale: 'en',
        source: 'WEB',
        deviceType: undefined,
      },
    });
  });
});
