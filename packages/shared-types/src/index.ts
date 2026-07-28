import { z } from 'zod';

// --- Enums (mirror Prisma / design-system tokens) ---

export const siteCategorySchema = z.enum([
  'HISTORICAL',
  'HANDICRAFT',
  'STREET',
  'LANDMARK',
  'FOOD',
]);
export const SITE_CATEGORIES = siteCategorySchema.options;
export const SITE_CATEGORIES_REQUIRING_COORDS = ['HISTORICAL', 'STREET', 'LANDMARK'] as const;
export const mediaTypeSchema = z.enum(['IMAGE', 'VIDEO', 'AUDIO']);
export const contentBlockTypeSchema = z.enum(['HEADING', 'PARAGRAPH', 'LIST', 'IMAGE', 'VIDEO', 'AUDIO']);
export const listStyleSchema = z.enum(['BULLET', 'NUMBERED']);
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
export type ListStyle = z.infer<typeof listStyleSchema>;
export type TextRole = z.infer<typeof textRoleSchema>;
export type ColorToken = z.infer<typeof colorTokenSchema>;
export type BlockAlign = z.infer<typeof blockAlignSchema>;
export type Locale = z.infer<typeof localeSchema>;

export function siteCategoryRequiresCoords(category: SiteCategory): boolean {
  return (SITE_CATEGORIES_REQUIRING_COORDS as readonly SiteCategory[]).includes(category);
}

function validateSiteCoords(
  value: { category: SiteCategory; lat?: string | null; lng?: string | null },
  ctx: z.RefinementCtx,
): void {
  if (!siteCategoryRequiresCoords(value.category)) {
    return;
  }
  if (!value.lat?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['lat'], message: 'lat is required for this category' });
  }
  if (!value.lng?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['lng'], message: 'lng is required for this category' });
  }
}

// --- Content block spans ---

export function isSafeHref(href: string): boolean {
  try {
    const url = new URL(href, 'http://localhost');
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:';
  } catch {
    return false;
  }
}

export const textSpanSchema = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  href: z
    .string()
    .min(1)
    .refine(isSafeHref, { message: 'href must be an http(s) or mailto link' })
    .optional(),
});

export type TextSpan = z.infer<typeof textSpanSchema>;

/**
 * Drops an unsafe `href` from a raw (not-yet-validated) span-like object,
 * without touching any other field. Used on the READ path so an already
 * persisted span with a legacy/malformed href degrades to plain text
 * instead of throwing and taking down the whole page. The WRITE path must
 * keep using `textSpanSchema`'s strict refine so bad input is rejected
 * with a 400 at save time.
 */
export function sanitizeUnsafeHref<T extends { href?: unknown }>(span: T): T {
  if (typeof span?.href === 'string' && span.href.length > 0 && !isSafeHref(span.href)) {
    const { href: _href, ...rest } = span;
    return rest as T;
  }
  return span;
}

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

export const listItemSchema = z.object({
  spans: z.array(textSpanSchema).min(1),
});

export const listBlockSchema = z.object({
  type: z.literal('LIST'),
  sortOrder: z.number().int(),
  listStyle: listStyleSchema,
  items: z.array(listItemSchema).min(1),
});

export type ListItem = z.infer<typeof listItemSchema>;

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
  listBlockSchema,
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
  lat: z.string().nullable(),
  lng: z.string().nullable(),
  isActive: z.boolean(),
  city: z.object({ slug: z.string(), nameFa: z.string(), nameEn: z.string() }),
  province: z.object({ slug: z.string(), nameFa: z.string(), nameEn: z.string() }),
  translations: z.array(siteTranslationDetailSchema),
});

export type SiteDetail = z.infer<typeof siteDetailSchema>;

// --- Auth & admin ---

export const userRoleSchema = z.enum(['MEMBER', 'ADMIN', 'SUPER_ADMIN']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    displayName: z.string().trim().min(1).max(100),
    password: z.string().min(8),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().min(1).optional(),
  })
  .refine((input) => Boolean(input.email || input.phone), {
    message: 'Email or phone is required',
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  role: userRoleSchema,
  displayName: z.string().nullable(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const adminUserSchema = z.object({
  id: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']),
  displayName: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const siteReviewSchema = z.object({
  id: z.string(),
  body: z.string(),
  authorName: z.string(),
  updatedAt: z.string(),
  likeCount: z.number().int().nonnegative(),
  likedByMe: z.boolean().optional(),
});
export type SiteReview = z.infer<typeof siteReviewSchema>;

export const memberReviewSchema = z.object({
  id: z.string(),
  body: z.string(),
  likeCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
  siteSlug: z.string(),
  siteTitle: z.string(),
});
export type MemberReview = z.infer<typeof memberReviewSchema>;

export const updateMemberProfileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().optional().or(z.literal('')),
    phone: z.string().trim().min(1).optional().or(z.literal('')),
    password: z.string().min(8).optional().or(z.literal('')),
  })
  .transform((input) => ({
    displayName: input.displayName,
    email: input.email?.trim() ? input.email.trim().toLowerCase() : null,
    phone: input.phone?.trim() ? input.phone.trim() : null,
    password: input.password?.trim() ? input.password : undefined,
  }))
  .refine((input) => Boolean(input.email || input.phone), {
    message: 'Email or phone is required',
  });
export type UpdateMemberProfileInput = z.infer<typeof updateMemberProfileSchema>;

export const upsertSiteReviewSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
export type UpsertSiteReviewInput = z.infer<typeof upsertSiteReviewSchema>;

export const createUserSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']),
  displayName: z.string().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  role: z.enum(['ADMIN', 'SUPER_ADMIN']).optional(),
  displayName: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const updateUserPasswordSchema = z.object({
  password: z.string().min(8),
});
export type UpdateUserPasswordInput = z.infer<typeof updateUserPasswordSchema>;

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

const adminListBlockWriteSchema = z.object({
  type: z.literal('LIST'),
  listStyle: listStyleSchema,
  items: z.array(listItemSchema).min(1),
});
export type AdminListBlockWrite = z.infer<typeof adminListBlockWriteSchema>;

export const adminBlockWriteSchema = z.discriminatedUnion('type', [
  adminTextBlockWriteSchema,
  adminListBlockWriteSchema,
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

export const siteSlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only');

export const createSiteFullSchema = z
  .object({
    slug: siteSlugSchema,
    category: siteCategorySchema,
    lat: z.string().nullable().optional(),
    lng: z.string().nullable().optional(),
    cityId: z.string().min(1),
    isActive: z.boolean().optional(),
    cover: coverWriteSchema,
    translations: z.array(adminTranslationFullSchema).min(3),
  })
  .superRefine(validateSiteCoords)
  .refine((v) => requireFaEnArTranslations(v.translations), {
    message: 'fa, en, and ar translations are required',
  });

export const updateSiteFullSchema = z
  .object({
    slug: siteSlugSchema,
    category: siteCategorySchema,
    lat: z.string().nullable().optional(),
    lng: z.string().nullable().optional(),
    cityId: z.string().min(1),
    isActive: z.boolean(),
    cover: coverWriteSchema,
    translations: z.array(adminTranslationFullSchema).min(3),
  })
  .superRefine(validateSiteCoords)
  .refine((v) => requireFaEnArTranslations(v.translations), {
    message: 'fa, en, and ar translations are required',
  });

export type CreateSiteFullInput = z.infer<typeof createSiteFullSchema>;
export type UpdateSiteFullInput = z.infer<typeof updateSiteFullSchema>;

export const adminSiteSchema = z.object({
  id: z.string(),
  slug: z.string(),
  category: siteCategorySchema,
  lat: z.string().nullable(),
  lng: z.string().nullable(),
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

export function validateListBlockFields(spans: unknown): ListItem[] {
  return z.object({ items: z.array(listItemSchema).min(1) }).parse(spans).items;
}

export function validateMediaBlockType(type: ContentBlockType): void {
  if (type !== 'IMAGE' && type !== 'VIDEO' && type !== 'AUDIO') {
    throw new Error('Not a media block type');
  }
}
