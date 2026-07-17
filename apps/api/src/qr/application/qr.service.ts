import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import QRCode from 'qrcode';
import sharp from 'sharp';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { buildBrandLockupPng, BRAND_LOCKUP_TOP } from './qr-brand-lockup.builder';
import { buildPlaqueSvg, PLAQUE_DIMENSIONS } from './qr-plaque.builder';

const LOGO_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <path d="M6 42V22C6 12.6 13.6 5 23 5H25C34.4 5 42 12.6 42 22V42" stroke="#4A3728" stroke-width="4"/>
  <rect x="14" y="26" width="20" height="16" rx="2" fill="#1D6F8C"/>
  <rect x="18" y="30" width="4" height="4" fill="#F5EDE1"/>
  <rect x="26" y="30" width="4" height="4" fill="#F5EDE1"/>
  <rect x="18" y="36" width="4" height="4" fill="#F5EDE1"/>
</svg>`;

@Injectable()
export class QrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  buildSiteScanUrl(slug: string): string {
    const webBase = this.config.get('PUBLIC_WEB_BASE_URL', { infer: true }).replace(/\/$/, '');
    return `${webBase}/sites/${slug}?src=qr`;
  }

  private async buildQrWithLogo(url: string, size = 480): Promise<Buffer> {
    const qrBuffer = await QRCode.toBuffer(url, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: size,
      margin: 1,
      color: { dark: '#2A1D14', light: '#FFFFFF' },
    });

    const logoSize = Math.round(size * 0.18);
    const padSize = Math.round(size * 0.22);
    const logoPng = await sharp(Buffer.from(LOGO_MARK_SVG)).resize(logoSize, logoSize).png().toBuffer();
    const whitePad = await sharp({
      create: {
        width: padSize,
        height: padSize,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .composite([{ input: logoPng, gravity: 'center' }])
      .toBuffer();

    return sharp(qrBuffer).composite([{ input: whitePad, gravity: 'center' }]).png().toBuffer();
  }

  async generateSiteQrPng(slug: string): Promise<Buffer> {
    const site = await this.prisma.site.findFirst({
      where: { slug, isActive: true },
      include: {
        translations: { where: { locale: 'fa' }, take: 1 },
        city: true,
      },
    });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    const translation = site.translations[0];
    const title = translation?.title ?? slug;
    const location = `${site.city.nameFa}، ایران`;
    const url = this.buildSiteScanUrl(slug);

    const qrBuffer = await this.buildQrWithLogo(url);
    const qrPngBase64 = qrBuffer.toString('base64');
    const svg = buildPlaqueSvg({
      title,
      location,
      qrPngBase64,
    });

    const basePng = await sharp(Buffer.from(svg)).png().toBuffer();
    const brandLockup = await buildBrandLockupPng();
    const brandLeft = Math.round((PLAQUE_DIMENSIONS.width - brandLockup.width) / 2);

    return sharp(basePng)
      .composite([{ input: brandLockup.png, left: brandLeft, top: BRAND_LOCKUP_TOP }])
      .png()
      .toBuffer();
  }
}
