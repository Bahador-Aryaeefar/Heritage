import { Injectable, NotFoundException } from '@nestjs/common';
// SiteVisitStats is not used by recordVisit; it is imported now so Task 3's
// getStats addition to this file stays a purely additive diff.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
}
