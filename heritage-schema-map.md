# Heritage Schema Map

> Field-level reference for the Kermanshah Heritage database. Prisma source of truth: `apps/api/prisma/schema.prisma`.

## Geography

### Province
| Field | Type | Notes |
|---|---|---|
| id | cuid | PK |
| nameFa, nameEn | string | Display names |
| slug | string | Unique, URL-safe |

### City
| Field | Type | Notes |
|---|---|---|
| id | cuid | PK |
| provinceId | FK → Province | Restrict delete |
| nameFa, nameEn | string | |
| slug | string | Unique |

## Site (core entity)

| Field | Type | Notes |
|---|---|---|
| slug | string | Unique; **immutable** once printed on QR |
| category | enum | `ANCIENT` \| `ISLAMIC` \| `NATURAL` |
| lat, lng | decimal(10,7) | Map / future nearby-sites |
| cityId | FK → City | |
| isActive | boolean | Soft offline; public API hides inactive |

### SiteTranslation
One row per site per locale (`fa`, `en`).

| Field | Notes |
|---|---|
| title | Page title, SEO |
| shortDescription | Landing cards only — not the full page body |

Long-form content lives in **SiteContentBlock**, not here.

## Media

| Field | Type | Notes |
|---|---|---|
| type | enum | `IMAGE` \| `VIDEO` \| `AUDIO` |
| url | string? | Local path under `/uploads/...` |
| embedUrl | string? | External video (Aparat/YouTube); no local file |
| mimeType | string? | e.g. `image/webp`, `audio/mpeg` |
| durationSec | int? | Audio/video |
| altFa, altEn | string? | Accessibility |
| sortOrder | int | Gallery ordering |
| isCover | boolean | **Images only**; at most one cover per site (enforced in service) |

## SiteContentBlock (flexible page body)

Ordered per `(siteId, locale)`. Public site detail API returns blocks in `sortOrder`.

### Block types
| type | Purpose |
|---|---|
| HEADING, PARAGRAPH | Text with design-system tokens |
| IMAGE, VIDEO, AUDIO | References a Media row |

### Text blocks (HEADING / PARAGRAPH)
| Field | Notes |
|---|---|
| textRole | `HERO` \| `H2` \| `H3` \| `BODY` \| `CAPTION` — maps to design-system type scale |
| colorToken | `BROWN_950` \| `BROWN_800` \| `BROWN_600` \| `TEAL_700` \| `SAND_50` |
| align | `START` \| `CENTER` |
| spans | JSON array: `{ text, bold?, italic? }[]` — inline emphasis within the block |

### Media blocks (IMAGE / VIDEO / AUDIO)
| Field | Notes |
|---|---|
| mediaId | Required; must belong to same site |
| caption | Optional label under media |

## QRCode

| Field | Notes |
|---|---|
| code | Unique identifier on physical plaque |
| installedAt | When plaque was placed |
| isActive | Inactive codes still exist for history |

`onDelete: Restrict` from Site — cannot delete a site with QR codes without explicit flow.

## VisitEvent (analytics — schema only in phase 2)

| Field | Notes |
|---|---|
| source | `QR` (scan) \| `WEB` (organic) |
| locale | Language used when visiting |
| deviceType | Optional coarse hint |
| qrCodeId | Optional link to physical QR |

No write API in the current phase.

## Auth & admin users

### User
| Field | Type | Notes |
|---|---|---|
| phone | string | Unique login identifier |
| passwordHash | string | bcrypt |
| role | enum | `ADMIN` \| `SUPER_ADMIN` |
| displayName | string? | Optional label in admin shell |
| isActive | boolean | Inactive users cannot log in |

### RefreshToken
| Field | Notes |
|---|---|
| tokenHash | sha256 of opaque refresh token (unique) |
| familyId | Rotation chain; reuse of revoked token kills family |
| expiresAt | ~7d default |
| revokedAt | Set on rotation, logout, password change, or reuse detection |

Seed creates one `SUPER_ADMIN` (`09120086846`).

## Public API mapping

| Endpoint | Data |
|---|---|
| `GET /api/v1/public/landing?page&limit` | Paginated active sites → cards (slug, category, cover, fa/en title + shortDescription, city/province) |
| `GET /api/v1/public/sites/:slug` | Site meta + translations + ordered blocks per locale |

## Admin API mapping (cookie auth)

| Endpoint | Role | Purpose |
|---|---|---|
| `POST /api/v1/auth/login` | public | Set access + refresh cookies |
| `POST /api/v1/auth/refresh` | refresh cookie | Rotate token pair |
| `POST /api/v1/auth/logout` | any | Revoke refresh + clear cookies |
| `GET /api/v1/auth/me` | access cookie | Current user |
| `GET/POST/PATCH /api/v1/admin/users` | `SUPER_ADMIN` | Paginated user list + CRUD + password reset |
| `GET/POST/PATCH /api/v1/admin/sites` | `ADMIN`, `SUPER_ADMIN` | Paginated site list + core CRUD |
| `POST /api/v1/admin/sites/:id/cover` | `ADMIN`, `SUPER_ADMIN` | Cover image upload |
| `GET /api/v1/admin/cities` | `ADMIN`, `SUPER_ADMIN` | Paginated city picker |

Scalar docs: `/docs` (OpenAPI at `/openapi.json`).

All list responses share `{ items, meta }`, where `meta` contains `page`, `limit`,
`totalItems`, `totalPages`, `hasNextPage`, and `hasPreviousPage`.

## Deferred (later phases)

- Content-block / media gallery admin editor
- VisitEvent insert on scan
