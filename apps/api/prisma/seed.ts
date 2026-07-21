import {
  MediaType,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { SEED_SITES, toPrismaBlock, type SeedSiteDefinition } from './seed-catalog';

const prisma = new PrismaClient();

const SUPER_ADMIN_PHONE = '09120086846';
const SUPER_ADMIN_PASSWORD = '78801215Dragons*';
const UPLOAD_DIR = resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
const WEB_PUBLIC_MEDIA = resolve(process.cwd(), '../web/public/media');
const SEED_ASSETS_DIR = join(__dirname, 'seed-assets');

const WIKI_USER_AGENT =
  'ShahrnamaSeed/1.0 (https://heritage.nobatix.ir; local-dev seed; contact: admin@localhost)';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRemoteImage(url: string, attempt = 1): Promise<Buffer> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(60_000),
    headers: {
      'User-Agent': WIKI_USER_AGENT,
      Accept: 'image/*,*/*',
    },
  });
  if (res.status === 429 && attempt < 5) {
    const waitMs = attempt * 2500;
    console.warn(`Rate limited fetching ${url}; retrying in ${waitMs}ms…`);
    await sleep(waitMs);
    return fetchRemoteImage(url, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
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

async function loadOptionalLocalCover(
  slug: string,
  remoteUrl: string | null,
  label: string,
): Promise<Buffer | null> {
  if (!remoteUrl) return null;
  const localPath = join(SEED_ASSETS_DIR, `${slug}-cover.jpg`);
  try {
    console.log(`Loading local seed asset: ${slug}-cover.jpg`);
    return await readFile(localPath);
  } catch {
    return loadSeedImage(remoteUrl, label);
  }
}

async function saveSeedImage(siteId: string, filenameBase: string, buffer: Buffer) {
  const processed = await sharp(buffer, { failOn: 'truncated' })
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
    webp: processed,
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

/** Short synthetic “voice-like” tone burst for seed audio samples. */
function createFakeVoiceWav(durationSec = 4, sampleRate = 16_000): Buffer {
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

  for (let i = 0; i < numSamples; i += 1) {
    const t = i / sampleRate;
    const env = Math.min(1, t * 8) * Math.max(0, 1 - (t - durationSec + 0.35) / 0.35);
    const formant =
      0.45 * Math.sin(2 * Math.PI * 180 * t) +
      0.3 * Math.sin(2 * Math.PI * 320 * t) +
      0.15 * Math.sin(2 * Math.PI * 520 * t);
    const vibrato = 1 + 0.04 * Math.sin(2 * Math.PI * 5 * t);
    const sample = Math.max(-1, Math.min(1, formant * vibrato * env * 0.55));
    buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
  }
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
  const safe = label.replace(/[<>&]/g, '');
  const svg = `<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#4A3728"/>
        <stop offset="100%" style="stop-color:#1D6F8C"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#g)"/>
    <text x="600" y="420" font-family="sans-serif" font-size="48" fill="#FBF7F0" text-anchor="middle">${safe}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).webp().toBuffer();
}

async function resetSiteContent(siteId: string) {
  await prisma.siteContentBlock.deleteMany({ where: { siteId } });
  await prisma.media.deleteMany({ where: { siteId } });
}

async function seedSite(def: SeedSiteDefinition, cityId: string) {
  const site = await prisma.site.upsert({
    where: { slug: def.slug },
    create: {
      slug: def.slug,
      category: def.category,
      lat: def.lat,
      lng: def.lng,
      cityId,
      isActive: true,
    },
    update: {
      category: def.category,
      lat: def.lat,
      lng: def.lng,
      cityId,
      isActive: true,
    },
  });

  for (const translation of def.translations) {
    await prisma.siteTranslation.upsert({
      where: { siteId_locale: { siteId: site.id, locale: translation.locale } },
      create: {
        siteId: site.id,
        locale: translation.locale,
        title: translation.title,
        shortDescription: translation.shortDescription,
      },
      update: {
        title: translation.title,
        shortDescription: translation.shortDescription,
      },
    });
  }

  await resetSiteContent(site.id);

  const coverBuffer = await loadOptionalLocalCover(def.slug, def.coverUrl, def.coverLabel);
  let coverMediaId: string | null = null;
  let sortOrder = 0;

  if (coverBuffer) {
    const coverStored = await saveSeedImage(site.id, 'cover', coverBuffer);
    await mirrorImageToWebPublic(def.slug, 'cover', coverStored.webp);
    const coverMedia = await prisma.media.create({
      data: {
        siteId: site.id,
        type: MediaType.IMAGE,
        url: coverStored.url,
        mimeType: coverStored.mimeType,
        sortOrder,
        isCover: true,
      },
    });
    coverMediaId = coverMedia.id;
    sortOrder += 1;
  }

  const audioStored = await saveSeedAudio(site.id, createFakeVoiceWav(4));
  const audioMedia = await prisma.media.create({
    data: {
      siteId: site.id,
      type: MediaType.AUDIO,
      url: audioStored.url,
      mimeType: audioStored.mimeType,
      durationSec: 4,
      sortOrder,
      isCover: false,
    },
  });
  sortOrder += 1;

  let videoMediaId: string | null = null;
  if (def.aparatEmbed) {
    const videoMedia = await prisma.media.create({
      data: {
        siteId: site.id,
        type: MediaType.VIDEO,
        embedUrl: def.aparatEmbed,
        sortOrder,
        isCover: false,
      },
    });
    videoMediaId = videoMedia.id;
  }

  const blocksByLocale = def.buildBlocks({
    coverMediaId,
    audioMediaId: audioMedia.id,
    videoMediaId,
  });

  for (const locale of ['fa', 'en', 'ar'] as const) {
    const rows = blocksByLocale[locale].map((block) => toPrismaBlock(site.id, locale, block));
    if (rows.length > 0) {
      await prisma.siteContentBlock.createMany({ data: rows });
    }
  }

  await prisma.qRCode.upsert({
    where: { code: def.qrCode },
    create: {
      siteId: site.id,
      code: def.qrCode,
      isActive: true,
    },
    update: {
      siteId: site.id,
      isActive: true,
    },
  });

  console.log(
    `Seeded ${def.category} site "${def.slug}" (cover ${coverMediaId ?? 'none'}, video ${videoMediaId ?? 'none'})`,
  );
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

  for (const [index, def] of SEED_SITES.entries()) {
    if (index > 0) await sleep(2000);
    await seedSite(def, city.id);
  }

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
