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
export const blockAlignSchema = z.enum(['START', 'CENTER', 'END']);
export const localeSchema = z.enum(['fa', 'en', 'ar']);

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
  href: z.string().min(1).optional(),
});

export type TextSpan = z.infer<typeof textSpanSchema>;

export const mediaRefSchema = z.object({
  id: z.string(),
  type: mediaTypeSchema,
  url: z.string().nullable(),
  embedUrl: z.string().nullable(),
  durationSec: z.number().int().nullable(),
});

export type MediaRef = z.infer<typeof mediaRefSchema>;

// --- Pagination ---

export const paginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export function paginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    meta: paginationMetaSchema,
  });
}

export type PaginatedResponse<T> = {
  items: T[];
  meta: PaginationMeta;
};

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

export const landingResponseSchema = paginatedResponseSchema(siteCardSchema);

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

// --- Auth & admin ---

export const userRoleSchema = z.enum(['ADMIN', 'SUPER_ADMIN']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const loginSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  phone: z.string(),
  role: userRoleSchema,
  displayName: z.string().nullable(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const adminUserSchema = z.object({
  id: z.string(),
  phone: z.string(),
  role: userRoleSchema,
  displayName: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const createUserSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(8),
  role: userRoleSchema,
  displayName: z.string().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  role: userRoleSchema.optional(),
  displayName: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const updateUserPasswordSchema = z.object({
  password: z.string().min(8),
});
export type UpdateUserPasswordInput = z.infer<typeof updateUserPasswordSchema>;

// Deprecated: superseded by createSiteFullSchema / updateSiteFullSchema (full
// multipart site write with media + content blocks). Kept only so the current
// JSON-only admin endpoints (PATCH /admin/sites/:id, POST .../cover) keep
// compiling until the atomic multipart create/replace endpoints land.
export const siteAdminTranslationSchema = z.object({
  locale: localeSchema,
  title: z.string().min(1),
  shortDescription: z.string().min(1),
});
export type SiteAdminTranslation = z.infer<typeof siteAdminTranslationSchema>;

/** @deprecated use {@link createSiteFullSchema} */
export const createSiteAdminSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  category: siteCategorySchema,
  lat: z.string(),
  lng: z.string(),
  cityId: z.string(),
  isActive: z.boolean().optional(),
  translations: z.array(siteAdminTranslationSchema).min(1),
});
export type CreateSiteAdminInput = z.infer<typeof createSiteAdminSchema>;

/** @deprecated use {@link updateSiteFullSchema} */
export const updateSiteAdminSchema = z.object({
  category: siteCategorySchema.optional(),
  lat: z.string().optional(),
  lng: z.string().optional(),
  cityId: z.string().optional(),
  isActive: z.boolean().optional(),
  translations: z.array(siteAdminTranslationSchema).optional(),
});
export type UpdateSiteAdminInput = z.infer<typeof updateSiteAdminSchema>;

// --- Admin media ---

export const adminMediaSchema = z.object({
  id: z.string(),
  type: mediaTypeSchema,
  url: z.string().nullable(),
  embedUrl: z.string().nullable(),
  contentHash: z.string().nullable(),
  isCover: z.boolean(),
});
export type AdminMedia = z.infer<typeof adminMediaSchema>;

// --- Admin content block write shapes ---

const adminTextBlockWriteSchema = z.object({
  type: z.enum(['HEADING', 'PARAGRAPH']),
  textRole: textRoleSchema,
  colorToken: colorTokenSchema,
  align: blockAlignSchema,
  spans: z.array(textSpanSchema).min(1),
});
export type AdminTextBlockWrite = z.infer<typeof adminTextBlockWriteSchema>;

const adminImageBlockWriteSchema = z
  .object({
    type: z.literal('IMAGE'),
    caption: z.string().nullable().optional(),
    mediaId: z.string().optional(),
    clientFileKey: z.string().optional(),
    contentHash: z.string().optional(),
  })
  .refine((v) => Boolean(v.mediaId || v.clientFileKey), {
    message: 'IMAGE block requires mediaId or clientFileKey',
  });
export type AdminImageBlockWrite = z.infer<typeof adminImageBlockWriteSchema>;

const adminAudioBlockWriteSchema = z
  .object({
    type: z.literal('AUDIO'),
    caption: z.string().nullable().optional(),
    mediaId: z.string().optional(),
    clientFileKey: z.string().optional(),
    contentHash: z.string().optional(),
  })
  .refine((v) => Boolean(v.mediaId || v.clientFileKey), {
    message: 'AUDIO block requires mediaId or clientFileKey',
  });
export type AdminAudioBlockWrite = z.infer<typeof adminAudioBlockWriteSchema>;

const adminVideoBlockWriteSchema = z.object({
  type: z.literal('VIDEO'),
  embedUrl: z.url(),
  caption: z.string().nullable().optional(),
  mediaId: z.string().optional(),
});
export type AdminVideoBlockWrite = z.infer<typeof adminVideoBlockWriteSchema>;

export const adminBlockWriteSchema = z.discriminatedUnion('type', [
  adminTextBlockWriteSchema,
  adminImageBlockWriteSchema,
  adminAudioBlockWriteSchema,
  adminVideoBlockWriteSchema,
]);
export type AdminBlockWrite = z.infer<typeof adminBlockWriteSchema>;

export const adminTranslationFullSchema = z.object({
  locale: localeSchema,
  title: z.string().min(1),
  shortDescription: z.string().min(1),
  blocks: z.array(adminBlockWriteSchema),
});
export type AdminTranslationFull = z.infer<typeof adminTranslationFullSchema>;

const coverWriteSchema = z
  .object({
    mediaId: z.string().optional(),
    clientFileKey: z.string().optional(),
    contentHash: z.string().optional(),
  })
  .refine((v) => Boolean(v.mediaId || v.clientFileKey), {
    message: 'cover requires mediaId or clientFileKey',
  })
  .optional();

function requireFaEnArTranslations<T extends { locale: string }>(translations: T[]) {
  const locales = new Set(translations.map((t) => t.locale));
  return locales.has('fa') && locales.has('en') && locales.has('ar');
}

export const createSiteFullSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
    category: siteCategorySchema,
    lat: z.string().min(1),
    lng: z.string().min(1),
    cityId: z.string().min(1),
    isActive: z.boolean().optional(),
    cover: coverWriteSchema,
    translations: z.array(adminTranslationFullSchema).min(3),
  })
  .refine((v) => requireFaEnArTranslations(v.translations), {
    message: 'fa, en, and ar translations are required',
  });

export const updateSiteFullSchema = z
  .object({
    category: siteCategorySchema,
    lat: z.string().min(1),
    lng: z.string().min(1),
    cityId: z.string().min(1),
    isActive: z.boolean(),
    cover: coverWriteSchema,
    translations: z.array(adminTranslationFullSchema).min(3),
  })
  .refine((v) => requireFaEnArTranslations(v.translations), {
    message: 'fa, en, and ar translations are required',
  });

export type CreateSiteFullInput = z.infer<typeof createSiteFullSchema>;
export type UpdateSiteFullInput = z.infer<typeof updateSiteFullSchema>;

export const adminSiteSchema = z.object({
  id: z.string(),
  slug: z.string(),
  category: siteCategorySchema,
  lat: z.string(),
  lng: z.string(),
  isActive: z.boolean(),
  city: z.object({
    id: z.string(),
    slug: z.string(),
    nameFa: z.string(),
    nameEn: z.string(),
  }),
  province: z.object({ slug: z.string(), nameFa: z.string(), nameEn: z.string() }),
  translations: z.array(
    z.object({
      locale: localeSchema,
      title: z.string(),
      shortDescription: z.string(),
      blocks: z.array(contentBlockSchema),
    }),
  ),
  media: z.array(adminMediaSchema),
  coverUrl: z.string().nullable(),
});
export type AdminSite = z.infer<typeof adminSiteSchema>;

export const cityOptionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameFa: z.string(),
  nameEn: z.string(),
  province: z.object({ slug: z.string(), nameFa: z.string(), nameEn: z.string() }),
});
export type CityOption = z.infer<typeof cityOptionSchema>;

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
