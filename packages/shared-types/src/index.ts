import { z } from 'zod';

// --- Enums (mirror Prisma / design-system tokens) ---

export const siteCategorySchema = z.enum(['ANCIENT', 'ISLAMIC', 'NATURAL']);
export const mediaTypeSchema = z.enum(['IMAGE', 'VIDEO', 'AUDIO']);
export const contentBlockTypeSchema = z.enum(['HEADING', 'PARAGRAPH', 'IMAGE', 'VIDEO', 'AUDIO']);
export const textRoleSchema = z.enum(['HERO', 'H2', 'H3', 'BODY', 'CAPTION']);
export const colorTokenSchema = z.enum([
  'BROWN_950',
  'BROWN_800',
  'BROWN_600',
  'TEAL_700',
  'SAND_50',
]);
export const blockAlignSchema = z.enum(['START', 'CENTER']);
export const localeSchema = z.enum(['fa', 'en']);

export type SiteCategory = z.infer<typeof siteCategorySchema>;
export type MediaType = z.infer<typeof mediaTypeSchema>;
export type ContentBlockType = z.infer<typeof contentBlockTypeSchema>;
export type TextRole = z.infer<typeof textRoleSchema>;
export type ColorToken = z.infer<typeof colorTokenSchema>;
export type BlockAlign = z.infer<typeof blockAlignSchema>;
export type Locale = z.infer<typeof localeSchema>;

// --- Content block spans ---

export const textSpanSchema = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
});

export type TextSpan = z.infer<typeof textSpanSchema>;

export const mediaRefSchema = z.object({
  id: z.string(),
  type: mediaTypeSchema,
  url: z.string().nullable(),
  embedUrl: z.string().nullable(),
  altFa: z.string().nullable(),
  altEn: z.string().nullable(),
  durationSec: z.number().int().nullable(),
});

export type MediaRef = z.infer<typeof mediaRefSchema>;

const textBlockBaseSchema = z.object({
  sortOrder: z.number().int(),
  textRole: textRoleSchema,
  colorToken: colorTokenSchema,
  align: blockAlignSchema,
  spans: z.array(textSpanSchema).min(1),
});

export const headingBlockSchema = textBlockBaseSchema.extend({
  type: z.literal('HEADING'),
});

export const paragraphBlockSchema = textBlockBaseSchema.extend({
  type: z.literal('PARAGRAPH'),
});

export const mediaBlockBaseSchema = z.object({
  sortOrder: z.number().int(),
  media: mediaRefSchema,
  caption: z.string().nullable(),
});

export const imageBlockSchema = mediaBlockBaseSchema.extend({
  type: z.literal('IMAGE'),
});

export const videoBlockSchema = mediaBlockBaseSchema.extend({
  type: z.literal('VIDEO'),
});

export const audioBlockSchema = mediaBlockBaseSchema.extend({
  type: z.literal('AUDIO'),
});

export const contentBlockSchema = z.discriminatedUnion('type', [
  headingBlockSchema,
  paragraphBlockSchema,
  imageBlockSchema,
  videoBlockSchema,
  audioBlockSchema,
]);

export type ContentBlock = z.infer<typeof contentBlockSchema>;

// --- Landing ---

export const siteTranslationCardSchema = z.object({
  locale: localeSchema,
  title: z.string(),
  shortDescription: z.string(),
});

export const siteCardSchema = z.object({
  slug: z.string(),
  category: siteCategorySchema,
  coverUrl: z.string().nullable(),
  city: z.object({ slug: z.string(), nameFa: z.string(), nameEn: z.string() }),
  province: z.object({ slug: z.string(), nameFa: z.string(), nameEn: z.string() }),
  translations: z.array(siteTranslationCardSchema),
});

export const landingResponseSchema = z.object({
  sites: z.array(siteCardSchema),
});

export type SiteCard = z.infer<typeof siteCardSchema>;
export type LandingResponse = z.infer<typeof landingResponseSchema>;

// --- Site detail ---

export const siteTranslationDetailSchema = z.object({
  locale: localeSchema,
  title: z.string(),
  shortDescription: z.string(),
  blocks: z.array(contentBlockSchema),
});

export const siteDetailSchema = z.object({
  slug: z.string(),
  category: siteCategorySchema,
  lat: z.string(),
  lng: z.string(),
  isActive: z.boolean(),
  city: z.object({ slug: z.string(), nameFa: z.string(), nameEn: z.string() }),
  province: z.object({ slug: z.string(), nameFa: z.string(), nameEn: z.string() }),
  translations: z.array(siteTranslationDetailSchema),
});

export type SiteDetail = z.infer<typeof siteDetailSchema>;

// --- Block validation (for seed / future admin) ---

export function validateTextBlockFields(type: ContentBlockType, spans: unknown): TextSpan[] {
  if (type !== 'HEADING' && type !== 'PARAGRAPH') {
    throw new Error('Not a text block type');
  }
  return z.array(textSpanSchema).min(1).parse(spans);
}

export function validateMediaBlockType(type: ContentBlockType): void {
  if (type !== 'IMAGE' && type !== 'VIDEO' && type !== 'AUDIO') {
    throw new Error('Not a media block type');
  }
}
