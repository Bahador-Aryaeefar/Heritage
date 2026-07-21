import {
  MediaType,
  PrismaClient,
  SiteCategory,
  UserRole,
} from '@prisma/client';
import { loadRootEnv } from '@heritage/env-loader';
import bcrypt from 'bcryptjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { buildArBlocks, buildEnBlocks, buildFaBlocks } from './taq-e-bostan-blocks';

loadRootEnv();

const prisma = new PrismaClient();

const SITE_SLUG = 'taq-e-bostan';
const QR_CODE = 'TQB-SEED-001';
const SUPER_ADMIN_PHONE = '09120086846';
const SUPER_ADMIN_PASSWORD = '78801215Dragons*';
const UPLOAD_DIR = resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
const WEB_PUBLIC_MEDIA = resolve(process.cwd(), '../web/public/media');

const SEED_ASSETS_DIR = join(__dirname, 'seed-assets');

const SEED_PHOTO_URLS = {
  cover:
    'https://upload.wikimedia.org/wikipedia/commons/a/a8/Taq-e-Bostan_%28Iran%29_Sassanid_Period.JPG',
  treeOfLife: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Taq-e_Bostan_-_tree_of_life.jpg',
  ivan: 'https://upload.wikimedia.org/wikipedia/commons/5/54/Kermanshah-taqe_bostan.jpg',
} as const;

const SEED_VIDEO_EMBED = 'https://www.youtube.com/embed/nKsNOB0Fukw';

async function fetchRemoteImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function loadSeedImageFile(
  filename: string,
  remoteUrl: string,
  label: string,
): Promise<Buffer> {
  const localPath = join(SEED_ASSETS_DIR, filename);
  try {
    console.log(`Loading local seed asset: ${filename}`);
    return await readFile(localPath);
  } catch {
    return loadSeedImage(remoteUrl, label);
  }
}

async function loadSeedImage(url: string, label: string): Promise<Buffer> {
  try {
    console.log(`Fetching seed photo: ${url}`);
    return await fetchRemoteImage(url);
  } catch (error) {
    console.warn(`Seed photo fetch failed (${url}), using placeholder:`, error);
    return createPlaceholderImage(label);
  }
}

async function saveSeedImage(siteId: string, filenameBase: string, buffer: Buffer) {
  const processed = await sharp(buffer)
    .rotate()
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const dir = join(UPLOAD_DIR, 'sites', siteId, 'images');
  await mkdir(dir, { recursive: true });
  const fileName = `${filenameBase}.webp`;
  await writeFile(join(dir, fileName), processed);
  return {
    url: `/uploads/sites/${siteId}/images/${fileName}`,
    mimeType: 'image/webp',
  };
}

async function mirrorImageToWebPublic(siteSlug: string, filenameBase: string, webpBuffer: Buffer) {
  if (process.env.SEED_MIRROR_WEB === '0') return;
  try {
    await mkdir(WEB_PUBLIC_MEDIA, { recursive: true });
  } catch {
    return;
  }
  const dir = join(WEB_PUBLIC_MEDIA, siteSlug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${filenameBase}.webp`), webpBuffer);
}

function createMinimalWav(durationSec = 1, sampleRate = 8000): Buffer {
  const numSamples = sampleRate * durationSec;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

async function saveSeedAudio(siteId: string, buffer: Buffer) {
  const dir = join(UPLOAD_DIR, 'sites', siteId, 'audio');
  await mkdir(dir, { recursive: true });
  const fileName = 'intro.wav';
  await writeFile(join(dir, fileName), buffer);
  return {
    url: `/uploads/sites/${siteId}/audio/${fileName}`,
    mimeType: 'audio/wav',
  };
}

async function createPlaceholderImage(label: string): Promise<Buffer> {
  const svg = `<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#4A3728"/>
        <stop offset="100%" style="stop-color:#1D6F8C"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#g)"/>
    <text x="600" y="420" font-family="sans-serif" font-size="48" fill="#FBF7F0" text-anchor="middle">${label}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).webp().toBuffer();
}

async function resetSiteContent(siteId: string) {
  await prisma.siteContentBlock.deleteMany({ where: { siteId } });
  await prisma.media.deleteMany({ where: { siteId } });
}

async function main() {
  const province = await prisma.province.upsert({
    where: { slug: 'kermanshah' },
    create: {
      slug: 'kermanshah',
      nameFa: 'کرمانشاه',
      nameEn: 'Kermanshah',
    },
    update: {
      nameFa: 'کرمانشاه',
      nameEn: 'Kermanshah',
    },
  });

  const city = await prisma.city.upsert({
    where: { slug: 'kermanshah-city' },
    create: {
      slug: 'kermanshah-city',
      nameFa: 'کرمانشاه',
      nameEn: 'Kermanshah',
      provinceId: province.id,
    },
    update: {
      nameFa: 'کرمانشاه',
      nameEn: 'Kermanshah',
      provinceId: province.id,
    },
  });

  const site = await prisma.site.upsert({
    where: { slug: SITE_SLUG },
    create: {
      slug: SITE_SLUG,
      category: SiteCategory.ANCIENT,
      lat: '34.3872000',
      lng: '47.1332000',
      cityId: city.id,
      isActive: true,
    },
    update: {
      category: SiteCategory.ANCIENT,
      lat: '34.3872000',
      lng: '47.1332000',
      cityId: city.id,
      isActive: true,
    },
  });

  await prisma.siteTranslation.upsert({
    where: { siteId_locale: { siteId: site.id, locale: 'fa' } },
    create: {
      siteId: site.id,
      locale: 'fa',
      title: 'طاق بستان',
      shortDescription:
        'مجموعه سنگ‌نگاره‌های ساسانی در دل کوهستان کرمانشاه، نماد میراث باستانی غرب ایران.',
    },
    update: {
      title: 'طاق بستان',
      shortDescription:
        'مجموعه سنگ‌نگاره‌های ساسانی در دل کوهستان کرمانشاه، نماد میراث باستانی غرب ایران.',
    },
  });

  await prisma.siteTranslation.upsert({
    where: { siteId_locale: { siteId: site.id, locale: 'en' } },
    create: {
      siteId: site.id,
      locale: 'en',
      title: 'Taq-e Bostan',
      shortDescription:
        'Sasanian rock reliefs carved into the mountains near Kermanshah, a landmark of ancient western Iran.',
    },
    update: {
      title: 'Taq-e Bostan',
      shortDescription:
        'Sasanian rock reliefs carved into the mountains near Kermanshah, a landmark of ancient western Iran.',
    },
  });

  await prisma.siteTranslation.upsert({
    where: { siteId_locale: { siteId: site.id, locale: 'ar' } },
    create: {
      siteId: site.id,
      locale: 'ar',
      title: 'طاق بستان',
      shortDescription:
        'مجموعة من النقوش الصخرية الساسانية المحفورة في جبال كرمانشاه، رمز التراث القديم في غرب إيران.',
    },
    update: {
      title: 'طاق بستان',
      shortDescription:
        'مجموعة من النقوش الصخرية الساسانية المحفورة في جبال كرمانشاه، رمز التراث القديم في غرب إيران.',
    },
  });

  await resetSiteContent(site.id);

  const coverBuffer = await loadSeedImageFile('cover.jpg', SEED_PHOTO_URLS.cover, 'Taq-e Bostan');
  const treeBuffer = await loadSeedImageFile(
    'tree-of-life.jpg',
    SEED_PHOTO_URLS.treeOfLife,
    'Tree of life',
  );
  const ivanBuffer = await loadSeedImageFile('large-ivan.jpg', SEED_PHOTO_URLS.ivan, 'Ivan');
  const coverStored = await saveSeedImage(site.id, 'cover', coverBuffer);
  const treeStored = await saveSeedImage(site.id, 'tree-of-life', treeBuffer);
  const ivanStored = await saveSeedImage(site.id, 'large-ivan', ivanBuffer);

  const coverWebp = await sharp(coverBuffer).rotate().resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const treeWebp = await sharp(treeBuffer).rotate().resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const ivanWebp = await sharp(ivanBuffer).rotate().resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  await mirrorImageToWebPublic(SITE_SLUG, 'cover', coverWebp);
  await mirrorImageToWebPublic(SITE_SLUG, 'tree-of-life', treeWebp);
  await mirrorImageToWebPublic(SITE_SLUG, 'large-ivan', ivanWebp);
  const audioStored = await saveSeedAudio(site.id, createMinimalWav(3));

  const coverMedia = await prisma.media.create({
    data: {
      siteId: site.id,
      type: MediaType.IMAGE,
      url: coverStored.url,
      mimeType: coverStored.mimeType,
      sortOrder: 0,
      isCover: true,
    },
  });

  const treeMedia = await prisma.media.create({
    data: {
      siteId: site.id,
      type: MediaType.IMAGE,
      url: treeStored.url,
      mimeType: treeStored.mimeType,
      sortOrder: 1,
      isCover: false,
    },
  });

  const ivanMedia = await prisma.media.create({
    data: {
      siteId: site.id,
      type: MediaType.IMAGE,
      url: ivanStored.url,
      mimeType: ivanStored.mimeType,
      sortOrder: 2,
      isCover: false,
    },
  });

  const audioMedia = await prisma.media.create({
    data: {
      siteId: site.id,
      type: MediaType.AUDIO,
      url: audioStored.url,
      mimeType: audioStored.mimeType,
      durationSec: 3,
      sortOrder: 3,
      isCover: false,
    },
  });

  const videoMedia = await prisma.media.create({
    data: {
      siteId: site.id,
      type: MediaType.VIDEO,
      embedUrl: SEED_VIDEO_EMBED,
      sortOrder: 4,
      isCover: false,
    },
  });

  const faBlocks = buildFaBlocks({
    coverMediaId: coverMedia.id,
    treeMediaId: treeMedia.id,
    ivanMediaId: ivanMedia.id,
    audioMediaId: audioMedia.id,
    videoMediaId: videoMedia.id,
  });

  const enBlocks = buildEnBlocks({
    coverMediaId: coverMedia.id,
    treeMediaId: treeMedia.id,
    ivanMediaId: ivanMedia.id,
    audioMediaId: audioMedia.id,
    videoMediaId: videoMedia.id,
  });

  const arBlocks = buildArBlocks({
    coverMediaId: coverMedia.id,
    treeMediaId: treeMedia.id,
    ivanMediaId: ivanMedia.id,
    audioMediaId: audioMedia.id,
    videoMediaId: videoMedia.id,
  });

  for (const block of faBlocks) {
    await prisma.siteContentBlock.create({
      data: {
        siteId: site.id,
        locale: 'fa',
        sortOrder: block.sortOrder,
        type: block.type,
        textRole: 'textRole' in block ? block.textRole : null,
        colorToken: 'colorToken' in block ? block.colorToken : null,
        align: 'align' in block ? block.align : null,
        spans: 'spans' in block ? block.spans : undefined,
        mediaId: 'mediaId' in block ? block.mediaId : null,
        caption: 'caption' in block ? block.caption : null,
      },
    });
  }

  for (const block of enBlocks) {
    await prisma.siteContentBlock.create({
      data: {
        siteId: site.id,
        locale: 'en',
        sortOrder: block.sortOrder,
        type: block.type,
        textRole: 'textRole' in block ? block.textRole : null,
        colorToken: 'colorToken' in block ? block.colorToken : null,
        align: 'align' in block ? block.align : null,
        spans: 'spans' in block ? block.spans : undefined,
        mediaId: 'mediaId' in block ? block.mediaId : null,
        caption: 'caption' in block ? block.caption : null,
      },
    });
  }

  for (const block of arBlocks) {
    await prisma.siteContentBlock.create({
      data: {
        siteId: site.id,
        locale: 'ar',
        sortOrder: block.sortOrder,
        type: block.type,
        textRole: 'textRole' in block ? block.textRole : null,
        colorToken: 'colorToken' in block ? block.colorToken : null,
        align: 'align' in block ? block.align : null,
        spans: 'spans' in block ? block.spans : undefined,
        mediaId: 'mediaId' in block ? block.mediaId : null,
        caption: 'caption' in block ? block.caption : null,
      },
    });
  }

  await prisma.qRCode.upsert({
    where: { code: QR_CODE },
    create: {
      siteId: site.id,
      code: QR_CODE,
      isActive: true,
    },
    update: {
      siteId: site.id,
      isActive: true,
    },
  });

  console.log(`Seeded site "${SITE_SLUG}" with cover media ${coverMedia.id}`);

  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { phone: SUPER_ADMIN_PHONE },
    create: {
      phone: SUPER_ADMIN_PHONE,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      displayName: 'Super Admin',
      isActive: true,
    },
    update: {
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log(`Seeded super admin user ${SUPER_ADMIN_PHONE}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
