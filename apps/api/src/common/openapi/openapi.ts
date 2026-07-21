import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  type OpenAPIObject,
} from '@nestjs/swagger';

type ComponentSchema = NonNullable<NonNullable<OpenAPIObject['components']>['schemas']>[string];
type SchemaObject = Exclude<ComponentSchema, { $ref: string }>;

export const PAGINATION_META_EXAMPLE = {
  page: 1,
  limit: 20,
  totalItems: 42,
  totalPages: 3,
  hasNextPage: true,
  hasPreviousPage: false,
};

export const PAGINATION_META_SCHEMA: SchemaObject = {
  type: 'object',
  required: [
    'page',
    'limit',
    'totalItems',
    'totalPages',
    'hasNextPage',
    'hasPreviousPage',
  ],
  properties: {
    page: { type: 'integer', minimum: 1, example: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, example: 20 },
    totalItems: { type: 'integer', minimum: 0, example: 42 },
    totalPages: { type: 'integer', minimum: 0, example: 3 },
    hasNextPage: { type: 'boolean', example: true },
    hasPreviousPage: { type: 'boolean', example: false },
  },
};

export const AUTH_USER_EXAMPLE = {
  id: 'cm123user',
  phone: '09120086846',
  role: 'SUPER_ADMIN',
  displayName: 'Super Admin',
};

export const AUTH_USER_SCHEMA: SchemaObject = {
  type: 'object',
  required: ['id', 'phone', 'role', 'displayName'],
  properties: {
    id: { type: 'string', example: AUTH_USER_EXAMPLE.id },
    phone: { type: 'string', example: AUTH_USER_EXAMPLE.phone },
    role: { type: 'string', enum: ['ADMIN', 'SUPER_ADMIN'], example: 'SUPER_ADMIN' },
    displayName: { type: 'string', nullable: true, example: 'Super Admin' },
  },
};

export const LOGIN_BODY_SCHEMA: SchemaObject = {
  type: 'object',
  required: ['phone', 'password'],
  properties: {
    phone: { type: 'string', example: '09120086846' },
    password: { type: 'string', format: 'password', example: 'StrongPassword123!' },
  },
};

export const ADMIN_USER_EXAMPLE = {
  ...AUTH_USER_EXAMPLE,
  isActive: true,
  createdAt: '2026-07-19T12:00:00.000Z',
};

export const ADMIN_USER_SCHEMA: SchemaObject = {
  type: 'object',
  required: ['id', 'phone', 'role', 'displayName', 'isActive', 'createdAt'],
  properties: {
    ...AUTH_USER_SCHEMA.properties,
    isActive: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time', example: ADMIN_USER_EXAMPLE.createdAt },
  },
};

export const CREATE_USER_BODY_SCHEMA: SchemaObject = {
  type: 'object',
  required: ['phone', 'password', 'role'],
  properties: {
    phone: { type: 'string', example: '09121234567' },
    password: { type: 'string', format: 'password', minLength: 8, example: 'StrongPassword123!' },
    role: { type: 'string', enum: ['ADMIN', 'SUPER_ADMIN'], example: 'ADMIN' },
    displayName: { type: 'string', example: 'Site editor' },
  },
};

export const UPDATE_USER_BODY_SCHEMA: SchemaObject = {
  type: 'object',
  properties: {
    role: { type: 'string', enum: ['ADMIN', 'SUPER_ADMIN'], example: 'ADMIN' },
    displayName: { type: 'string', nullable: true, example: 'Senior editor' },
    isActive: { type: 'boolean', example: true },
  },
};

export const UPDATE_PASSWORD_BODY_SCHEMA: SchemaObject = {
  type: 'object',
  required: ['password'],
  properties: {
    password: { type: 'string', format: 'password', minLength: 8, example: 'NewStrongPassword123!' },
  },
};

export const OK_SCHEMA: SchemaObject = {
  type: 'object',
  required: ['ok'],
  properties: { ok: { type: 'boolean', example: true } },
};

export const CITY_EXAMPLE = {
  id: 'cm123city',
  slug: 'kermanshah-city',
  nameFa: 'کرمانشاه',
  nameEn: 'Kermanshah',
  province: {
    slug: 'kermanshah',
    nameFa: 'کرمانشاه',
    nameEn: 'Kermanshah',
  },
};

export const PROVINCE_REF_SCHEMA: SchemaObject = {
  type: 'object',
  required: ['slug', 'nameFa', 'nameEn'],
  properties: {
    slug: { type: 'string', example: 'kermanshah' },
    nameFa: { type: 'string', example: 'کرمانشاه' },
    nameEn: { type: 'string', example: 'Kermanshah' },
  },
};

export const CITY_SCHEMA: SchemaObject = {
  type: 'object',
  required: ['id', 'slug', 'nameFa', 'nameEn', 'province'],
  properties: {
    id: { type: 'string', example: CITY_EXAMPLE.id },
    slug: { type: 'string', example: CITY_EXAMPLE.slug },
    nameFa: { type: 'string', example: CITY_EXAMPLE.nameFa },
    nameEn: { type: 'string', example: CITY_EXAMPLE.nameEn },
    province: PROVINCE_REF_SCHEMA,
  },
};

const SITE_TRANSLATIONS_EXAMPLE = [
  {
    locale: 'fa',
    title: 'طاق‌بستان',
    shortDescription: 'مجموعه‌ای تاریخی از دوره ساسانی',
  },
  {
    locale: 'en',
    title: 'Taq-e Bostan',
    shortDescription: 'A Sasanian rock relief complex',
  },
];

const SITE_TRANSLATION_SCHEMA: SchemaObject = {
  type: 'object',
  required: ['locale', 'title', 'shortDescription'],
  properties: {
    locale: { type: 'string', enum: ['fa', 'en'], example: 'fa' },
    title: { type: 'string', example: 'طاق‌بستان' },
    shortDescription: { type: 'string', example: 'مجموعه‌ای تاریخی از دوره ساسانی' },
  },
};

export const SITE_CARD_EXAMPLE = {
  slug: 'taq-e-bostan',
  category: 'ANCIENT',
  coverUrl: 'http://localhost:4000/uploads/taq-e-bostan/cover.webp',
  city: {
    slug: 'kermanshah-city',
    nameFa: 'کرمانشاه',
    nameEn: 'Kermanshah',
  },
  province: CITY_EXAMPLE.province,
  translations: SITE_TRANSLATIONS_EXAMPLE,
};

export const SITE_CARD_SCHEMA: SchemaObject = {
  type: 'object',
  required: ['slug', 'category', 'coverUrl', 'city', 'province', 'translations'],
  properties: {
    slug: { type: 'string', example: SITE_CARD_EXAMPLE.slug },
    category: {
      type: 'string',
      enum: ['ANCIENT', 'ISLAMIC', 'NATURAL'],
      example: 'ANCIENT',
    },
    coverUrl: { type: 'string', nullable: true, example: SITE_CARD_EXAMPLE.coverUrl },
    city: {
      type: 'object',
      properties: {
        slug: { type: 'string', example: 'kermanshah-city' },
        nameFa: { type: 'string', example: 'کرمانشاه' },
        nameEn: { type: 'string', example: 'Kermanshah' },
      },
    },
    province: PROVINCE_REF_SCHEMA,
    translations: { type: 'array', items: SITE_TRANSLATION_SCHEMA },
  },
};

export const ADMIN_SITE_EXAMPLE = {
  id: 'cm123site',
  slug: 'taq-e-bostan',
  category: 'ANCIENT',
  lat: '34.3872000',
  lng: '47.1332000',
  isActive: true,
  city: {
    id: 'cm123city',
    slug: 'kermanshah-city',
    nameFa: 'کرمانشاه',
    nameEn: 'Kermanshah',
  },
  province: CITY_EXAMPLE.province,
  translations: SITE_TRANSLATIONS_EXAMPLE,
  coverUrl: 'http://localhost:4000/uploads/taq-e-bostan/cover.webp',
};

export const ADMIN_SITE_SCHEMA: SchemaObject = {
  type: 'object',
  required: [
    'id',
    'slug',
    'category',
    'lat',
    'lng',
    'isActive',
    'city',
    'province',
    'translations',
    'coverUrl',
  ],
  properties: {
    id: { type: 'string', example: ADMIN_SITE_EXAMPLE.id },
    slug: { type: 'string', example: ADMIN_SITE_EXAMPLE.slug },
    category: {
      type: 'string',
      enum: ['ANCIENT', 'ISLAMIC', 'NATURAL'],
      example: 'ANCIENT',
    },
    lat: { type: 'string', example: ADMIN_SITE_EXAMPLE.lat },
    lng: { type: 'string', example: ADMIN_SITE_EXAMPLE.lng },
    isActive: { type: 'boolean', example: true },
    city: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'cm123city' },
        slug: { type: 'string', example: 'kermanshah-city' },
        nameFa: { type: 'string', example: 'کرمانشاه' },
        nameEn: { type: 'string', example: 'Kermanshah' },
      },
    },
    province: PROVINCE_REF_SCHEMA,
    translations: { type: 'array', items: SITE_TRANSLATION_SCHEMA },
    coverUrl: { type: 'string', nullable: true, example: ADMIN_SITE_EXAMPLE.coverUrl },
  },
};

export const SITE_DETAIL_EXAMPLE = {
  ...SITE_CARD_EXAMPLE,
  lat: '34.3872000',
  lng: '47.1332000',
  isActive: true,
  translations: [
    {
      ...SITE_TRANSLATIONS_EXAMPLE[0],
      blocks: [
        {
          type: 'PARAGRAPH',
          sortOrder: 1,
          textRole: 'BODY',
          colorToken: 'BROWN_800',
          align: 'START',
          spans: [{ text: 'طاق‌بستان یکی از مهم‌ترین آثار ساسانی است.' }],
        },
      ],
    },
  ],
};

export const SITE_DETAIL_SCHEMA: SchemaObject = {
  type: 'object',
  required: ['slug', 'category', 'lat', 'lng', 'isActive', 'city', 'province', 'translations'],
  properties: {
    ...SITE_CARD_SCHEMA.properties,
    lat: { type: 'string', example: '34.3872000' },
    lng: { type: 'string', example: '47.1332000' },
    isActive: { type: 'boolean', example: true },
    translations: {
      type: 'array',
      items: {
        allOf: [
          SITE_TRANSLATION_SCHEMA,
          {
            type: 'object',
            properties: {
              blocks: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: true,
                  example: SITE_DETAIL_EXAMPLE.translations[0]?.blocks[0],
                },
              },
            },
          },
        ],
      },
    },
  },
};

// --- Admin full-write (multipart) payloads ---
// `POST /admin/sites` and `PUT /admin/sites/:id` take a multipart request with
// a JSON-encoded `payload` field (validated by createSiteFullSchema /
// updateSiteFullSchema after parsing) plus one file field per referenced
// clientFileKey. These consts/helpers document that shape for Swagger; they
// are not runtime validation (Zod owns that).

const SITE_FULL_TEXT_BLOCK_EXAMPLE = {
  type: 'PARAGRAPH',
  textRole: 'BODY',
  colorToken: 'BROWN_800',
  align: 'START',
  text: 'طاق‌بستان یکی از مهم‌ترین آثار ساسانی است.',
};

const SITE_FULL_TRANSLATIONS_EXAMPLE = SITE_TRANSLATIONS_EXAMPLE.map((translation) => ({
  ...translation,
  blocks: [SITE_FULL_TEXT_BLOCK_EXAMPLE],
}));

export const CREATE_SITE_FULL_EXAMPLE = {
  slug: 'new-heritage-site',
  category: 'ANCIENT',
  lat: '34.3872000',
  lng: '47.1332000',
  cityId: 'cm123city',
  isActive: true,
  cover: { clientFileKey: 'cover' },
  translations: SITE_FULL_TRANSLATIONS_EXAMPLE,
};

export const UPDATE_SITE_FULL_EXAMPLE = {
  slug: 'new-heritage-site',
  category: 'ANCIENT',
  lat: '34.3872000',
  lng: '47.1332000',
  cityId: 'cm123city',
  isActive: true,
  cover: { mediaId: 'cm123media' },
  translations: SITE_FULL_TRANSLATIONS_EXAMPLE,
};

/** `@ApiConsumes` + `@ApiBody` for the multipart `payload` + dynamic file fields shape. */
export function ApiMultipartSiteBody(payloadExample: unknown) {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['payload'],
        properties: {
          payload: {
            type: 'string',
            description:
              'JSON-encoded site payload; parsed then validated with createSiteFullSchema / updateSiteFullSchema.',
            example: JSON.stringify(payloadExample),
          },
          cover: {
            type: 'string',
            format: 'binary',
            description: 'File for a payload.cover.clientFileKey of "cover".',
          },
        },
        additionalProperties: {
          type: 'string',
          format: 'binary',
          description: 'One file field per other clientFileKey referenced by a block in payload.translations.',
        },
      },
    }),
  );
}

export const ERROR_SCHEMA: SchemaObject = {
  type: 'object',
  properties: {
    statusCode: { type: 'integer', example: 400 },
    message: {
      oneOf: [
        { type: 'string', example: 'Validation failed' },
        { type: 'array', items: { type: 'string' }, example: ['page must not be less than 1'] },
      ],
    },
    error: { type: 'string', example: 'Bad Request' },
  },
};

export function ApiPaginatedResponse(
  summary: string,
  itemSchema: SchemaObject,
  itemExample: unknown,
) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiOkResponse({
      description: 'Paginated result. Use page and limit query parameters.',
      schema: {
        type: 'object',
        required: ['items', 'meta'],
        properties: {
          items: { type: 'array', items: itemSchema },
          meta: PAGINATION_META_SCHEMA,
        },
        example: { items: [itemExample], meta: PAGINATION_META_EXAMPLE },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid page or limit.',
      schema: ERROR_SCHEMA,
    }),
  );
}

export function ApiJsonBody(schema: SchemaObject, example: unknown) {
  return ApiBody({ schema, examples: { default: { value: example } } });
}

export function ApiJsonOk(summary: string, schema: SchemaObject, example: unknown) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiOkResponse({ schema, example }),
  );
}

export function ApiJsonCreated(summary: string, schema: SchemaObject, example: unknown) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiCreatedResponse({ schema, example }),
  );
}

export function ApiNoContent(summary: string) {
  return applyDecorators(ApiOperation({ summary }), ApiNoContentResponse());
}

export function ApiProtectedErrors() {
  return applyDecorators(
    ApiUnauthorizedResponse({
      description: 'Missing, expired, or invalid access token.',
      schema: ERROR_SCHEMA,
    }),
    ApiForbiddenResponse({
      description: 'The authenticated role cannot perform this operation.',
      schema: ERROR_SCHEMA,
    }),
  );
}

export function ApiValidationError() {
  return ApiBadRequestResponse({
    description: 'Request validation failed.',
    schema: ERROR_SCHEMA,
  });
}

export function ApiResourceNotFound(resource: string) {
  return ApiNotFoundResponse({
    description: `${resource} was not found.`,
    schema: ERROR_SCHEMA,
  });
}
