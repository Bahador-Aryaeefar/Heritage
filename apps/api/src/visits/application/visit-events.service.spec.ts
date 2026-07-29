import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { buildDailyCounts, VisitEventsService } from './visit-events.service';

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

describe('VisitEventsService.getStats', () => {
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

  it('throws 404 for a missing site', async () => {
    prisma.site.findUnique.mockResolvedValue(null);
    await expect(service.getStats('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('aggregates totals, source split, and per-QR-code scan counts', async () => {
    prisma.site.findUnique.mockResolvedValue({ id: 'site1' });
    prisma.visitEvent.count.mockResolvedValueOnce(12).mockResolvedValueOnce(8).mockResolvedValueOnce(4);
    prisma.visitEvent.findMany.mockResolvedValue([]);
    prisma.qRCode.findMany.mockResolvedValue([
      { code: 'taq-e-bostan-ab12', isActive: true, _count: { visitEvents: 8 } },
    ]);

    const stats = await service.getStats('site1');

    expect(stats.totalVisits).toBe(12);
    expect(stats.qrVisits).toBe(8);
    expect(stats.webVisits).toBe(4);
    expect(stats.qrCodes).toEqual([{ code: 'taq-e-bostan-ab12', isActive: true, scanCount: 8 }]);
    expect(stats.last30Days).toHaveLength(31);
  });
});

describe('buildDailyCounts', () => {
  it('stays exactly 31 entries and drops events outside the seeded window (DB/app clock skew)', () => {
    const since = new Date(Date.now() - 30 * 86_400_000);

    // Simulates the DB clock running ahead of the app clock: an event dated
    // "tomorrow" relative to the app's `now`, and one dated well before
    // `since`. Neither should ever be bucketed, since both fall outside the
    // reported window by definition.
    const tomorrow = new Date(Date.now() + 86_400_000);
    const wayBefore = new Date(since.getTime() - 10 * 86_400_000);

    const counts = buildDailyCounts([{ createdAt: tomorrow }, { createdAt: wayBefore }], since);

    expect(counts).toHaveLength(31);
    const tomorrowKey = tomorrow.toISOString().slice(0, 10);
    const wayBeforeKey = wayBefore.toISOString().slice(0, 10);
    expect(counts.find((entry) => entry.date === tomorrowKey)).toBeUndefined();
    expect(counts.find((entry) => entry.date === wayBeforeKey)).toBeUndefined();
    expect(counts.reduce((sum, entry) => sum + entry.count, 0)).toBe(0);
  });

  it('still counts an event that falls inside the seeded window', () => {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const insideEvent = new Date(since.getTime() + 86_400_000);

    const counts = buildDailyCounts([{ createdAt: insideEvent }], since);

    expect(counts).toHaveLength(31);
    const insideKey = insideEvent.toISOString().slice(0, 10);
    expect(counts.find((entry) => entry.date === insideKey)?.count).toBe(1);
  });
});
