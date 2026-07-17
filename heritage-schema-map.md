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

## Public API mapping

| Endpoint | Data |
|---|---|
| `GET /api/v1/public/landing` | Active sites → cards (slug, category, cover, fa/en title + shortDescription, city/province) |
| `GET /api/v1/public/sites/:slug` | Site meta + translations + ordered blocks per locale |

## Deferred (schema present, HTTP later)

- Admin CRUD for sites, blocks, media
- Auth / JWT
- VisitEvent insert on scan
