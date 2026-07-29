import { Injectable, NotFoundException } from '@nestjs/common';
import type { RecordVisitInput, SiteVisitStats } from '@heritage/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { parseDeviceType } from './device-type';

@Injectable()
export class VisitEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordVisit(slug: string, input: RecordVisitInput, userAgent?: string): Promise<void> {
    const site = await this.prisma.site.findFirst({
      where: { slug, isActive: true },
      select: { id: true },
    });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    let qrCodeId: string | undefined;
    if (input.source === 'QR') {
      const qrCode = await this.prisma.qRCode.findFirst({
        where: { siteId: site.id, isActive: true },
        select: { id: true },
      });
      qrCodeId = qrCode?.id;
    }

    await this.prisma.visitEvent.create({
      data: {
        siteId: site.id,
        qrCodeId,
        locale: input.locale,
        source: input.source,
        deviceType: parseDeviceType(userAgent),
      },
    });
  }

  async getStats(siteId: string): Promise<SiteVisitStats> {
    const site = await this.prisma.site.findUnique({ where: { id: siteId }, select: { id: true } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    const since = new Date(Date.now() - 30 * 86_400_000);
    const [totalVisits, qrVisits, webVisits, recentEvents, qrCodes] = await Promise.all([
      this.prisma.visitEvent.count({ where: { siteId } }),
      this.prisma.visitEvent.count({ where: { siteId, source: 'QR' } }),
      this.prisma.visitEvent.count({ where: { siteId, source: 'WEB' } }),
      this.prisma.visitEvent.findMany({
        where: { siteId, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.qRCode.findMany({
        where: { siteId },
        select: { code: true, isActive: true, _count: { select: { visitEvents: true } } },
      }),
    ]);

    return {
      totalVisits,
      qrVisits,
      webVisits,
      last30Days: buildDailyCounts(recentEvents, since),
      qrCodes: qrCodes.map((qr) => ({
        code: qr.code,
        isActive: qr.isActive,
        scanCount: qr._count.visitEvents,
      })),
    };
  }
}

export function buildDailyCounts(
  events: { createdAt: Date }[],
  since: Date,
): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  const cursor = new Date(since);
  const now = new Date();
  while (cursor <= now) {
    counts.set(cursor.toISOString().slice(0, 10), 0);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  for (const event of events) {
    const key = event.createdAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}
