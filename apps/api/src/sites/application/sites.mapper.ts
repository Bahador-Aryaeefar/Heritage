import { ContentBlockType, Media, Prisma, SiteContentBlock } from '@prisma/client';
import {
  contentBlockSchema,
  landingResponseSchema,
  listItemSchema,
  localeSchema,
  siteDetailSchema,
  textSpanSchema,
  type ContentBlock,
  type LandingResponse,
  type MediaRef,
  type SiteDetail,
} from '@heritage/shared-types';
import { z } from 'zod';

export const siteCardSelect = {
  id: true,
  slug: true,
  category: true,
  isActive: true,
  city: {
    select: {
      slug: true,
      nameFa: true,
      nameEn: true,
      province: { select: { slug: true, nameFa: true, nameEn: true } },
    },
  },
  translations: {
    select: { locale: true, title: true, shortDescription: true },
  },
  media: {
    where: { isCover: true },
    take: 1,
    select: { url: true, embedUrl: true },
  },
} satisfies Prisma.SiteSelect;

export const siteDetailSelect = {
  slug: true,
  category: true,
  lat: true,
  lng: true,
  isActive: true,
  city: {
    select: {
      slug: true,
      nameFa: true,
      nameEn: true,
      province: { select: { slug: true, nameFa: true, nameEn: true } },
    },
  },
  translations: {
    select: { locale: true, title: true, shortDescription: true },
  },
  blocks: {
    orderBy: { sortOrder: 'asc' as const },
    include: { media: true },
  },
  media: true,
} satisfies Prisma.SiteSelect;

type SiteCardRow = Prisma.SiteGetPayload<{ select: typeof siteCardSelect }>;
type SiteDetailRow = Prisma.SiteGetPayload<{ select: typeof siteDetailSelect }>;

export function mapMediaRef(media: Media, toAbsoluteUrl: (url: string) => string): MediaRef {
  return {
    id: media.id,
    type: media.type,
    url: media.url ? toAbsoluteUrl(media.url) : null,
    embedUrl: media.embedUrl,
    durationSec: media.durationSec,
  };
}

export function mapBlock(
  block: SiteContentBlock & { media: Media | null },
  toAbsoluteUrl: (url: string) => string,
): ContentBlock {
  if (block.type === ContentBlockType.HEADING || block.type === ContentBlockType.PARAGRAPH) {
    const spans = textSpanSchema.array().min(1).parse(block.spans ?? []);
    return {
      type: block.type,
      sortOrder: block.sortOrder,
      textRole: block.textRole!,
      colorToken: block.colorToken!,
      align: block.align!,
      spans,
    };
  }

  if (block.type === ContentBlockType.LIST) {
    const items = z.object({ items: listItemSchema.array().min(1) }).parse(block.spans ?? {}).items;
    return {
      type: 'LIST',
      sortOrder: block.sortOrder,
      listStyle: block.listStyle!,
      items,
    };
  }

  if (!block.media) {
    throw new Error(`Media block ${block.id} is missing media relation`);
  }

  return {
    type: block.type,
    sortOrder: block.sortOrder,
    media: mapMediaRef(block.media, toAbsoluteUrl),
    caption: block.caption,
  };
}

export function mapSiteCard(
  site: SiteCardRow,
  toAbsoluteUrl: (url: string) => string,
): LandingResponse['items'][number] {
  const cover = site.media[0];
  const coverUrl = cover?.url ? toAbsoluteUrl(cover.url) : null;

  return {
    slug: site.slug,
    category: site.category,
    coverUrl,
    city: {
      slug: site.city.slug,
      nameFa: site.city.nameFa,
      nameEn: site.city.nameEn,
    },
    province: {
      slug: site.city.province.slug,
      nameFa: site.city.province.nameFa,
      nameEn: site.city.province.nameEn,
    },
    translations: site.translations.map((t) => ({
      locale: localeSchema.parse(t.locale),
      title: t.title,
      shortDescription: t.shortDescription,
    })),
  };
}

export function mapSiteDetail(
  site: SiteDetailRow,
  toAbsoluteUrl: (url: string) => string,
): SiteDetail {
  const blocksByLocale = new Map<string, SiteDetailRow['blocks']>();
  for (const block of site.blocks) {
    const list = blocksByLocale.get(block.locale) ?? [];
    list.push(block);
    blocksByLocale.set(block.locale, list);
  }

  return {
    slug: site.slug,
    category: site.category,
    lat: site.lat?.toString() ?? null,
    lng: site.lng?.toString() ?? null,
    isActive: site.isActive,
    city: {
      slug: site.city.slug,
      nameFa: site.city.nameFa,
      nameEn: site.city.nameEn,
    },
    province: {
      slug: site.city.province.slug,
      nameFa: site.city.province.nameFa,
      nameEn: site.city.province.nameEn,
    },
    translations: site.translations.map((t) => ({
      locale: localeSchema.parse(t.locale),
      title: t.title,
      shortDescription: t.shortDescription,
      blocks: (blocksByLocale.get(t.locale) ?? []).map((b) => mapBlock(b, toAbsoluteUrl)),
    })),
  };
}

export function parseLandingResponse(data: LandingResponse): LandingResponse {
  return landingResponseSchema.parse(data);
}

export function parseSiteDetail(data: SiteDetail): SiteDetail {
  const parsed = siteDetailSchema.parse(data);
  for (const translation of parsed.translations) {
    for (const block of translation.blocks) {
      contentBlockSchema.parse(block);
    }
  }
  return parsed;
}
