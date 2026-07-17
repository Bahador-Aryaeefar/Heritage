# Design System - Kermanshah Heritage

> This is the visual reference for the project. Any new UI element should first be checked against these tokens before inventing a new one.

## 1. Colors

### Base palette (brown / earth)
| Name | Hex | Usage |
|---|---|---|
| brown-950 | `#2A1D14` | Primary text, dark backgrounds (footer, hero) |
| brown-800 | `#4A3728` | Headings, logo, secondary button |
| brown-600 | `#7A5C41` | Secondary/body text |
| sand-100 | `#F5EDE1` | Card and section backgrounds |
| sand-50 | `#FBF7F0` | Main page background |

### Accent palette (turquoise blue)
| Name | Hex | Usage |
|---|---|---|
| teal-700 | `#1D6F8C` | Primary button, links, active icons |
| teal-500 | `#3D93AE` | Hover state, gradients |
| teal-200 | `#BFE0EA` | Eyebrow/badge background |

### Ratio rule
- 60–70% of visual space: brown/sand palette
- 10–15%: teal (interactive points only - buttons, links, active icons)
- Teal is never used as a large background; its role is to guide, not decorate

### Status colors (phase-two - placeholder)
- Success: an earthy green consistent with the palette (proposed: `#4C7A5E`)
- Error: an earthy red, not a saturated one (proposed: `#B44B3D`)
- Both need a final pass once the admin panel is actually being built

## 2. Typography

- Font: **Vazirmatn** (full Persian + Latin support, high legibility across weights)
- Since good, widely-used Persian serif fonts are scarce, the decision is: use Vazirmatn alone across weights to build hierarchy, rather than pairing two families

| Role | Weight | Size (desktop) |
|---|---|---|
| H1 (hero) | 900 (Black) | 32–52px (clamp) |
| H2 (section) | 900 (Black) | 24–34px |
| H3 (card) | 700 (Bold) | 15–17px |
| Body text | 400 (Regular) | 15–17px |
| Eyebrow/label | 700 (Bold) | 12px, letter-spacing |
| Caption/metadata | 400–500 | 12–13px |

## 3. Spacing & sizing

- Base unit: 4px (multiples of 4: 8, 12, 16, 20, 24, 28, 32...)
- Border-radius: 10px for buttons/inputs, 14–16px for cards, 24px for large containers (hero visual)
- Section spacing: 70px vertical on desktop, ~40px on mobile

## 4. Base components

### Buttons
- **Primary**: teal-700 background, white/sand-50 text, no border
- **Secondary**: no background, 2px brown-800 border, brown-800 text
- Hover: subtle `translateY(-2px)`, no heavy shadow

### Cards (Site Card)
- sand-100 background, no heavy shadow - just a thin border (brown at low opacity)
- Image at the top of the card; when no real photo exists yet, use a brown→teal gradient placeholder

### Badge/Eyebrow
- teal-200 background, teal-700 text, full pill border-radius, small bold text

## 5. Logo

- Mark: an arch (inspired by Taq-e Bostan) merged with a QR-code corner square - represents the link between "historical heritage" and "technology"
- Logo colors: arch line in brown-800, QR square in teal-700
- Minimum usable size: 32px (needs testing to confirm legibility at small sizes)
- A single-color version (for printing on physical QR plaques) still needs to be produced - only the color version exists so far

## 6. Photography & imagery

- Site photos should be natural and documentary, not stock/generic
- Avoid color filters or overlays on real photos; the brown background palette already provides enough harmony
- Where a real photo isn't ready yet, use a brown→teal gradient placeholder (not flat gray)

## 7. RTL notes

- All layouts are designed RTL-first (`dir="rtl"` at the html level)
- Directional icons (arrows, chevrons) must be mirrored in RTL
- Numbers in Persian content (e.g. step numbers) use Persian digits (۰۱, ۰۲), not Latin ones

## 8. Breakpoints

| Name | Width | Note |
|---|---|---|
| Mobile | up to 700px | Grids collapse to one column, nav becomes hidden/hamburger |
| Tablet | 700–900px | Two-column grid in some sections |
| Desktop | 900px+ | Full multi-column layout |

> Since a large share of traffic comes from QR scans on mobile, design should be tested mobile-first, not just made responsive after the desktop version.

## 9. Where the tokens live in code

- Sections 1-3 are codified as Tailwind v4 `@theme` tokens in `apps/web/app/globals.css` (colors, radii `--radius-button/card/container`, breakpoints `--breakpoint-md: 700px` / `--breakpoint-lg: 900px`, `--font-sans` → Vazirmatn).
- Any change to this document's tokens must be mirrored there in the same session, and vice versa.
- First primitive built from them: `components/ui/badge.tsx` (§4 Badge/Eyebrow spec).

## 10. Site content blocks (API → future renderer)

Public site pages are built from ordered **content blocks** (see `heritage-schema-map.md`). Text blocks use these API tokens — map them to §1–2 when building the Next renderer:

| API `textRole` | Maps to |
|---|---|
| `HERO` | H1 (hero) — weight 900, clamp 32–52px |
| `H2` | H2 (section) — weight 900, 24–34px |
| `H3` | H3 (card) — weight 700, 15–17px |
| `BODY` | Body — weight 400, **17px**, default color **`brown-800`** on patterned backgrounds |
| `CAPTION` | Caption/metadata — weight 400–500, 12–13px |

| API `colorToken` | Tailwind / hex |
|---|---|
| `BROWN_950` | `brown-950` / `#2A1D14` |
| `BROWN_800` | `brown-800` / `#4A3728` |
| `BROWN_600` | `brown-600` / `#7A5C41` |
| `TEAL_700` | `teal-700` / `#1D6F8C` |
| `SAND_50` | `sand-50` / `#FBF7F0` |

Inline **bold** / *italic* come from span flags on each text run, not freeform CSS.

## 11. Public page layout (landing + site detail)

Reference mock: [`heritage.html`](./heritage.html). Implemented in `apps/web/components/public/`.

### Landing section order

1. **Site header** — logo lockup, anchor nav, language switcher; hamburger below 900px
2. **Hero** — two-column grid (copy + plaque visual); collapses to one column on mobile
3. **Promo banner (top)** — full-width strip below hero
4. **How it works** — section head + 3 step cards
5. **Promo banner (mid)** — second full-width strip
6. **Sites grid** — API-driven cards, 3 columns → 1 on mobile
7. **Site footer** — brown-950 band, centered caption

Section vertical padding: 70px desktop / 40px mobile (§3).

### Hero

| Element | Spec |
|---|---|
| Eyebrow | §4 Badge |
| Headline | H1 clamp 26–38px, weight 900; accent phrase in `teal-700` |
| Lead | 15px, `brown-600`, max-width ~672px (`max-w-2xl`) |
| CTA row | Primary + secondary buttons (§4), gap 12px |
| Photo | Real Taq-e Bostan photo (Wikimedia Commons via `lib/heritage-images.ts`); 4:3 aspect, rounded container; QR plaque overlay at bottom |

Page content max width: **1400px** (`max-w-[1400px]`), full viewport horizontal padding `6vw`. Section heads are not capped to a narrow column.

### Copy punctuation

User-facing strings must not use em dashes (`—`) or decorative separator lines (repeated `-` / `_` patterns). Use commas, periods, or short sentences instead.

### Step card

- Background `sand-100`, radius 14px (`rounded-card`), padding 28×24px, `overflow-hidden`
- Teal accent: 4px × 48px rounded bar (`bg-teal-700`) at top of card content (not a border on the card edge)
- Step number: 12px bold `teal-700`, Persian digits when locale is `fa`
- Title: 16px bold `brown-950`; body: **17px** `brown-800`

### Promo banner

Full-width strip with optional background photo (`imageSrc`) and dark overlay for contrast. Two variants via `variant` prop:

| Variant | Background (no image) | Overlay (with image) |
|---|---|---|
| `neutral` | `sand-100` | `brown-950/72` |
| `accent` | `teal-700` | `teal-900/82` |

Min height 140px; padding 32px 6vw; inner content max-width 1400px. Title 18–20px; body 14–15px. CTA uses primary button (on accent/image: inverted sand button).

Content source: `messages/*.json` → `home.banners.top` / `home.banners.mid`; photos from `lib/heritage-images.ts` until a CMS exists.

### Site card

- Radius 16px, `sand-100`, 1px border brown-800/8%
- Thumb: 150px height, cover image or brown→teal gradient placeholder
- Body padding 18px; title 15px bold; description **15px** `brown-800`

### Site detail article

- Max width **1400px** (same as landing); block gap 32px
- Page hero: title (H1 clamp 26–38px), shortDescription (**17px** `brown-800`), category badge, city/province line
- Main content in semi-opaque panel: `rounded-container bg-sand-100/95`, ring, light backdrop blur for contrast over the patterned background
- Blocks rendered via `BlockRenderer` (§10 token map); H2 clamp 22–28px, body **17px**
- Inline images: **`max-w-lg`**, centered, `object-contain`, not full-bleed

### Motion (scroll reveal)

Codified in `globals.css`:

| Token | Value |
|---|---|
| `--motion-reveal-duration` | 400ms |
| `--motion-reveal-easing` | ease-out |
| `--motion-reveal-distance` | 12px (translateY) |

`RevealOnScroll`: checks viewport on mount (above-the-fold content shows immediately), then Intersection Observer with `rootMargin: 120px` so sections animate before fully entering view. No per-block stagger on site detail pages.

### Logo lockup

- Mark: 42×42px SVG (`LogoMark`)
- Wordmark: 19px weight 900 `brown-800`; subtitle 11px `teal-700`, letter-spacing 1px
- QR codes embed `LogoMark` centered on white pad (error correction level H)

### Cards (`HeritageCard`)

Simple shell: `rounded-card`, **`overflow-hidden`**, faint gold border (`gold-600/20`), soft shadow. No corner ornaments.

### Page background

Fixed full-viewport layer (`HeritagePageBackground`): `sand-50` + diagonal stripes (`brown-800` at 12%, 2px / 14px, -45°). Slow drift via `heritage-bg-drift` (22s loop); disabled when `prefers-reduced-motion`.

### Site header

Sticky top bar: `bg-sand-100/92`, `backdrop-blur-md`, bottom border `brown-800/10`.

### Site detail layout

Full content width up to **1400px** (same as landing). Article blocks sit in a sand panel for readability. **Images, audio, and video blocks are centered** (`mx-auto`, max-width capped); images use `object-contain`, not full-bleed stretch.

### QR display

- On-screen: `HeritageQrCode` (canvas + centered logo)
- Print/download: `GET /api/v1/public/sites/:slug/qr.png` returns a **plaque PNG** (dark brown diagonal frame, cream card with site title, location, QR with centered logo, and brand lockup inside the card: logo + «میراث کرمانشاه»). The web app proxies this at `/downloads/sites/:slug/plaque.png` (same-origin) so browser download works reliably via `PlaqueDownloadButton`.
- Target URL: `https://heritage.nobatix.ir/sites/{slug}?src=qr` (via `PUBLIC_WEB_BASE_URL` / `NEXT_PUBLIC_SITE_URL`)
- Download on landing hero overlay and site detail QR panel

## Open questions

- [ ] Icon set: which library (Lucide/Phosphor) fits the palette best?
- [ ] Single-color logo version for printing on physical plaques
