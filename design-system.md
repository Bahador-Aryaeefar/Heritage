# Design System - Shahrnama (شهرنما)

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
- 60-70% of visual space: brown/sand palette
- 10-15%: teal (interactive points only - buttons, links, active icons)
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
| H1 (hero) | 900 (Black) | 32-52px (clamp) |
| H2 (section) | 900 (Black) | 24-34px |
| H3 (card) | 700 (Bold) | 15-17px |
| Body text | 400 (Regular) | 15-17px |
| Eyebrow/label | 700 (Bold) | 12px, letter-spacing |
| Caption/metadata | 400-500 | 12-13px |

## 3. Spacing & sizing

- Base unit: 4px (multiples of 4: 8, 12, 16, 20, 24, 28, 32...)
- Border-radius: 10px for buttons/inputs, 14-16px for cards, 24px for large containers (hero visual)
- Section spacing: 70px vertical on desktop, ~40px on mobile

## 4. Base components

### Buttons
- **Primary**: teal-700 background, white/sand-50 text, no border
- **Secondary**: no background, 2px brown-800 border, brown-800 text
- Hover: subtle `translateY(-2px)`, no heavy shadow
- Cursor: `pointer` on all enabled buttons / `[role=button]`; `not-allowed` when disabled (global in `globals.css`)

### Cards (Site Card)
- sand-100 background, no heavy shadow - just a thin border (brown at low opacity)
- Image at the top of the card; when no real photo exists yet, use `CategoryCover` (brown→teal gradient + category line icon)

### Badge/Eyebrow
- **One size only:** `inline-flex`, `rounded-full`, `px-3 py-1`, `text-xs font-bold tracking-wide`
- **Tones (color only):** `default` = teal-200 / teal-700; `muted` = brown-800/10 / brown-600 (inactive/neutral status)
- Never invent a second pill with different padding or `text-[11px]`  -  use `components/ui/badge.tsx` with a tone
- Component: `apps/web/components/ui/badge.tsx`

## 5. Logo

- Mark: an arch (inspired by Taq-e Bostan) merged with a QR-code corner square - represents the link between "historical heritage" and "technology"
- Logo colors: arch line in brown-800, QR square in teal-700
- Minimum usable size: 32px (needs testing to confirm legibility at small sizes)
- A single-color version (for printing on physical QR plaques) still needs to be produced - only the color version exists so far

## 6. Photography & imagery

- Site photos should be natural and documentary, not stock/generic
- Avoid color filters or overlays on real photos; the brown background palette already provides enough harmony
- Where a real photo isn't ready yet, use `CategoryCover`  -  brown→teal gradient with a simple line icon per `SiteCategory` (`components/ui/category-cover.tsx`), not flat gray

## 7. RTL notes

- All layouts are designed RTL-first (`dir="rtl"` at the html level)
- Directional icons (arrows, chevrons) must be mirrored in RTL
- Numbers in Persian content (e.g. step numbers) use Persian digits (۰۱, ۰۲), not Latin ones

## 8. Breakpoints

| Name | Width | Note |
|---|---|---|
| Mobile | up to 700px | Grids collapse to one column, nav becomes hidden/hamburger |
| Tablet | 700-900px | Two-column grid in some sections |
| Desktop | 900px+ | Full multi-column layout |

> Since a large share of traffic comes from QR scans on mobile, design should be tested mobile-first, not just made responsive after the desktop version.

## 9. Where the tokens live in code

- Sections 1-3 are codified as Tailwind v4 `@theme` tokens in `apps/web/app/globals.css` (colors, radii `--radius-button/card/container`, breakpoints `--breakpoint-md: 700px` / `--breakpoint-lg: 900px`, `--font-sans` → Vazirmatn).
- Any change to this document's tokens must be mirrored there in the same session, and vice versa.
- First primitive built from them: `components/ui/badge.tsx` (§4 Badge/Eyebrow spec).

## 10. Site content blocks (API → future renderer)

Public site pages are built from ordered **content blocks** (see `heritage-schema-map.md`). Text blocks use these API tokens  -  map them to §1-2 when building the Next renderer:

| API `textRole` | Maps to |
|---|---|
| `HERO` | H1 (hero)  -  weight 900, clamp 32-52px |
| `H2` | H2 (section)  -  weight 900, 24-34px |
| `H3` | H3 (card)  -  weight 700, 15-17px |
| `BODY` | Body  -  weight 400, **17px**, default color **`brown-800`** on patterned backgrounds |
| `CAPTION` | Caption/metadata  -  weight 400-500, 12-13px |

| API `colorToken` | Tailwind / hex |
|---|---|
| `BROWN_950` | `brown-950` / `#2A1D14` |
| `BROWN_800` | `brown-800` / `#4A3728` |
| `BROWN_600` | `brown-600` / `#7A5C41` |
| `TEAL_700` | `teal-700` / `#1D6F8C` |
| `SAND_50` | `sand-50` / `#FBF7F0` |

Inline **bold** / *italic* / links come from span flags on each text run, not freeform CSS:

| Span flag | Public rendering |
|---|---|
| `bold` | `<strong>` |
| `italic` | `<em>` |
| `href` | `<a>`  -  `font-bold text-teal-700 hover:text-teal-500`; absolute http(s) links open in a new tab with `rel="noopener noreferrer"` |

| API `align` | Tailwind |
|---|---|
| `START` | `text-start` |
| `CENTER` | `text-center` |
| `END` | `text-end` |

**Media accessibility (2026-07-21):** block image `alt` and audio/video `aria-label` = the block **caption** for that locale (empty when caption is absent). Cover and site-card thumbnails use **`alt={slug}`**  -  no separate alt fields on `Media`.

## 11. Public page layout (landing + site detail)

Reference mock: [`heritage.html`](./heritage.html). Implemented in `apps/web/components/public/`.

### Landing section order

1. **Site header**  -  logo lockup, anchor nav (`#categories`, `#how`, `#contact`), **Sign in** or **View profile** (teal primary when signed in, secondary outline when guest; links to `/login` or `/profile`), language switcher; hamburger below 900px
2. **Hero**  -  two-column grid (copy + plaque visual); secondary CTA → `#categories`
3. **Category stack**  -  3D fanned cards on a `sand-100/90` band; card transition ~500ms; dwell between switches ~5.5s; click/tab only changes the active card (no page scroll); `prefers-reduced-motion` → flat crossfade (`components/public/category-stack.tsx`)
4. **Topic promo banners**  -  one unique full-bleed photo strip **immediately above** How it works and above each category section (not above the stack; no repeats). Copy under `home.banners.how` / `home.banners.categories.*`; images in `lib/heritage-images.ts` (`landingBannerImages`, Wikimedia Commons URLs)
5. **How it works**  -  section head + 3 step cards
6. **Five category sections**  -  each `id="category-..."`, short blurb, sites for that category via `SitesCarousel` (`components/public/sites-carousel.tsx` + `category-section.tsx`):
   - Card density/variant differs by category (featured / compact / rail / default); FOOD keeps teal rank badges
   - If **more than 4 items** or the viewport cannot fit the full list → side prev/next buttons advance **one card at a time** (slide animation, **no** overflow-x scrollbar)
   - Otherwise a static wrapping grid
7. **Site footer**  -  brown-950 band, centered caption; shared `SiteFooter` on public pages and admin (panel + login); `flex-1` main keeps footer at bottom on short pages; bottom padding includes `env(safe-area-inset-bottom)` on mobile

Mixed single `SitesGrid` stays unused on the landing.

Section vertical padding: 70px desktop / 40px mobile (§3).

### Hero

| Element | Spec |
|---|---|
| Eyebrow | §4 Badge |
| Headline | H1 clamp 26-38px, weight 900; accent phrase in `teal-700` |
| Lead | 15px, `brown-600`, max-width ~672px (`max-w-2xl`) |
| CTA row | Primary + secondary buttons (§4), gap 12px |
| Photo | Real Taq-e Bostan photo (Wikimedia Commons via `lib/heritage-images.ts`); 4:3 aspect, rounded container; plaque overlay: brand lockup at **top-left** on opaque `sand-50` card with white logo pad (matches header lockup palette), site name **16px** + location **14px** + download **12px** + QR at bottom |

Page content max width: **1400px** (`max-w-[1400px]`), full viewport horizontal padding `6vw`. Section heads are not capped to a narrow column.

### Copy punctuation

**No AI punctuation anywhere** (UI, i18n, seed, comments, guides, commits). Banned: em dash, en dash used as prose, ellipsis character, curly quotes, decorative bullets/stars. Prefer commas, periods, colons, ASCII hyphen `-`, straight quotes, and `...`. Empty placeholders use ASCII `-`. Full list: `.cursor/rules/no-ai-punctuation.mdc`.

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

Min height 140px; padding 32px 6vw; inner content max-width 1400px. Title 18-20px; body 14-15px. CTA uses primary button (on accent/image: inverted sand button).

Content source: `messages/*.json` → `home.banners.how` and `home.banners.categories.{HISTORICAL|HANDICRAFT|STREET|LANDMARK|FOOD}`; photos from `landingBannerImages` in `lib/heritage-images.ts` (Wikimedia) until a CMS exists.

### Site card

- Radius 16px, `sand-100`, 1px border brown-800/8%
- Thumb: 150px height (`default`), or `featured` / `compact` / `rail` variants for category layouts; cover image or `CategoryCover`; cover `alt={site.slug}` / fallback `aria-label={slug}`
- Optional `index` badge (teal-700) for food ranking
- Body padding 18px (compact: tighter); title 15px bold (featured 17px); description **15px** `brown-800`
- Landing lists use `SitesCarousel`: side prev/next when item count > 4 or cards do not fit; no overflow-x rail scroll

### Site detail article

- Max width **1400px** (same as landing); block gap 32px
- Page hero: title (H1 clamp 26-38px), shortDescription (**17px** `brown-800`), category badge, location block (`SiteLocation`)
- Location block: city/province line (`text-sm text-teal-700`), coordinates caption (`text-xs text-brown-600`, locale-aware digits), Google Maps + Neshan links (`text-sm font-bold text-teal-700`), Google Maps iframe (`max-w-3xl`, `aspect-video`, `rounded-container`, `ring-brown-800/8`, `loading="lazy"`)
- Main content in semi-opaque panel: `rounded-container bg-sand-100/95`, ring, light backdrop blur for contrast over the patterned background
- Blocks rendered via `BlockRenderer` (§10 token map); H2 clamp 22-28px, body **17px**
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

Sticky top bar: `bg-sand-100/92`, `backdrop-blur-md`, bottom border `brown-800/10`. Desktop nav: anchor links + auth CTA (`/login` guest, `/profile` member) + `LanguageSwitcher`. Mobile drawer repeats anchor links and auth CTA.

### Site detail layout

Full content width up to **1400px** (same as landing). Article blocks sit in a sand panel for readability. **Images, audio, and video blocks are centered** (`mx-auto`, max-width capped); images use `object-contain`, not full-bleed stretch.

### QR display

- On-screen: `HeritageQrCode` (canvas + centered logo)
- Print/download: `GET /api/v1/public/sites/:slug/qr.png` returns a **plaque PNG** (dark brown diagonal frame, cream card with site title, location, QR with centered logo, and brand lockup inside the card: logo + «شهرنما»). The web app proxies this at `/downloads/sites/:slug/plaque.png` (same-origin) so browser download works reliably via `PlaqueDownloadButton`.
- Target URL: `https://heritage.nobatix.ir/sites/{slug}?src=qr` (via `PUBLIC_WEB_BASE_URL` / `NEXT_PUBLIC_SITE_URL`)
- Download on landing hero overlay and site detail QR panel

### Admin panel

Implemented under `/admin` (fa default) and `/en/admin/...`. Shares public page atmosphere (`HeritagePageBackground` diagonal stripes).

**Type scale (must match §2  -  no freestyle `text-sm` / `text-[11px]` for body chrome):**

| Role | Size | Where |
|---|---|---|
| Page title | `clamp(22px, 2.4vw, 30px)` black | Sites / users H1 |
| Body / interactive | **15px** (`text-[15px]`) | Nav, buttons, inputs, select rows, list titles, status copy, errors |
| Field label / table header | **12px** bold (`text-xs`) | `Field`, map label, column headers |
| Caption / metadata | **12-13px** | Slug, phone, file name, map hint |
| Brand tagline only | `text-[11px]` tracking-wide | Sidebar tagline (documented exception) |
| Stat tile number only | `text-[22px]` black | Visit-stats panel totals (documented exception - a compact tile headline is not the same role as the page-title H1, and 15px body copy reads too weak for a headline number; scoped to this one tile pattern, not for reuse elsewhere) |

**Layout:**

| Element | Spec |
|---|---|
| Shell | Floating `rounded-container` sidebar + top bar on opaque `sand-100`; logo on white pad; sidebar nav = **five category links** (`HISTORICAL`...`FOOD`) + Users (SuperAdmin); active = `teal-700` pill; header includes language dropdown + localized role badge; host chrome `z-30` so menus clear the body; **shared `SiteFooter`** below the shell (same brown-950 band as public) |
| Main panel | Opaque sand-100; padding `p-5` / `md:p-6`; nested lists/cards use **white** + `border-brown-800/15` |
| Forms | **Full width of main**  -  do not center with `max-w-3xl` / `mx-auto` (login card may stay `max-w-md`) |
| Site edit QR | On edit only: white `rounded-card` `AdminSiteQrPanel`  -  live `HeritageQrCode` from slug URL + plaque PNG download (`/downloads/sites/{slug}/plaque.png`); target URL label follows page `dir`, URL value in nested `dir="ltr"` span |
| Site edit visit stats | On edit only, below the QR panel: white `rounded-card` `VisitStatsPanel` (`components/admin/visit-stats-panel.tsx`). Fetches `GET /admin/sites/:id/visit-stats` via `adminFetch` + React Query (`queryKey: ['admin', 'sites', siteId, 'visit-stats']`). Loading/error copy in **15px** body size (loading `brown-600`, error `[#B44B3D]` matching the form's own error color). Layout: 3-column stat-tile grid (total / QR / web visits, each white-on-`sand-50` `rounded-button` tile, number **22px black** - see type-scale exception above, label **12px** `text-xs` `brown-600`); "last 30 days" day-strip as plain `<li>` bars (`h-6 w-2 shrink-0 rounded-sm bg-teal-700`, opacity keyed to that day's count, `title` tooltip plus `aria-label` with date + count so the series is not decorative-only to screen readers, `<ul>` named by its heading via `aria-labelledby` - no charting library, by design). The strip stays a **single row** (`flex-nowrap`) inside an `overflow-x-auto` wrapper: wrapping to a second row breaks the at-a-glance trend read, so the container scrolls rather than the page. Under `dir="rtl"` the bars run oldest-at-right, which is the correct RTL timeline convention (reading-start = past) and needs no override. The QR-code subsection is **omitted entirely when a site has no QR codes**, rather than rendering a bare heading. QR-code list as `sand-50` rows (code in nested `dir="ltr"` span, scan count, then status `Badge` `tone="default"`/`"muted"` for active/inactive - never a hand-rolled pill). |
| Lists | Filtered by sidebar category (`?category=` + API `category`); white nested rows on sand panels (`items-center`): cover thumb → title + status `Badge` (`gap-1`, `items-start`) → **slug** (before actions) → Edit/Delete; search + always-visible pagination: first / prev / up to **3** nearby page numbers / next / last (icon buttons + teal current page; 10/page) on sites and users; page H1 + New CTA / empty / delete copy is per-category |
| Category + location | Category is **locked** from the active tab (create) or existing entry (edit)  -  shown as `Badge`, not a Select. Map/lat/lng only for `HISTORICAL`/`STREET`/`LANDMARK`; handicraft/food show category-specific location hint instead |
| Login | Opaque sand-100 card; language switcher above; **shared `SiteFooter`** below centered card |
| Form controls | Inputs/selects/image picker sit on **white** with `border-brown-800/25`. Select + language switcher use 20×20 `ChevronIcon` |
| Users | Parent CSS grid + `subgrid` rows; phone uses inner `dir="ltr"` span; **Add user** / **Edit** modals; **Delete** (disabled for self) with confirm |
| i18n | All admin chrome + forms + errors via `messages/{fa,en,ar}.json` under `admin.*` |

### Admin form controls (`components/ui/`)

| Control | Spec |
|---|---|
| `TextInput` / `TextArea` / `Field` | `rounded-button`, **white** fill, `border-brown-800/25`; focus ring `teal-700/15` |
| `Select` | Custom button + **portaled** dropdown (`fixed` on `document.body`, inline `zIndex: 1100`) so menus clear Leaflet panes/controls (400-1000) and fields below; positioning via `lib/measure-portal-menu.ts` (flip-up, `maxHeight`, `visualViewport` clamp); white fill; 20×20 `ChevronIcon` |
| `Checkbox` | Custom 20px square; off = white + brown border; on = teal fill + check |
| `ImagePicker` | Dashed white `rounded-card` preview; pick/change/clear via `ActionButton` (not ad-hoc `text-xs` pills) |
| `ChevronIcon` | Shared 20×20 stroke chevron for Select + LanguageSwitcher |
| `LocationMapPicker` | Map.ir raster + Leaflet; `aspect-video` min height, `rounded-card`; teal pin; click/drag syncs lat/lng fields (`components/admin/location-map-picker.tsx`) |
| `ActionButton` | Primary/secondary/ghost; **15px** bold; same hover lift as §4 Buttons |
| `Tabs` | White segmented track (`border-brown-800/15`, `p-1`) on sand panels; each tab `rounded-button`, **15px** bold; active = `teal-700` / `sand-50` + nav shadow; inactive = `brown-800`, `hover:bg-sand-50`; `role="tablist"` / `role="tab"` (`components/ui/tabs.tsx`) |

### Document block editor (`BlockListEditor` shell)

Ordered editor for a site's `SiteContentBlock` rows (one instance per locale tab, §10). **Document canvas + side inspector**  -  not a stack of per-block form cards. Specs: [`docs/superpowers/specs/2026-07-21-document-canvas-editor-design.md`](docs/superpowers/specs/2026-07-21-document-canvas-editor-design.md), [`docs/superpowers/specs/2026-07-21-editor-completeness-design.md`](docs/superpowers/specs/2026-07-21-editor-completeness-design.md).

**Shell** (`components/admin/block-list-editor.tsx`): owns `selectedKey` / `textFocusKey`; composes `BlockCanvas` + `BlockInspector`. Same controlled API as before: `value: EditorBlock[]` / `onChange` / `labels` / optional `onPickFile`. Structural edits use `lib/block-editor-utils.ts` (`insertBlockAt`, `moveBlock`, `reorderBlock`, `convertBlockType`). See `lib/copy-blocks-from-fa.ts` for the `EditorBlock` union and `copyBlocksFromFa()` (EN "copy from FA").

| Element | Spec |
|---|---|
| Layout | `flex-col` on narrow viewports; `lg:flex-row`  -  canvas `flex-1`, inspector beside it on large screens |
| Selection | One block at a time; click canvas background deselects; stale selection cleared when the block leaves `value` |
| Keyboard | **Escape** deselects; **Delete/Backspace** removes the selected block only when focus is **not** in `INPUT` / `TEXTAREA` / `SELECT` / contenteditable (so in-canvas typing and inspector fields stay safe) |
| File picking | Shell never hashes/optimizes  -  `onPickFile(block, file)` bubbles raw `File` to the caller (`lib/file-hash.ts`, `lib/optimize-image.ts`); multipart field name === `clientFileKey` on save |
| Copy from FA | New keys + copied spans/caption/embedUrl; keeps `mediaId`, drops FA-only `clientFileKey`/`previewUrl`; used from EN **and AR** tabs |
| `contentDir` | Optional `dir` prop (`rtl` \| `ltr`) from active content tab  -  passed to title/short fields and canvas text editors so FA/AR stay RTL and EN LTR regardless of admin UI locale |

#### `SpanTextEditor` (`components/admin/span-text-editor.tsx`)

`contenteditable` div bound to `TextSpan[]`; on input/blur walks editor DOM and emits normalized spans (`lib/editor-link-html.ts`). Linked runs render as teal public-style `<a>` labels (no markdown chrome). Plain click on a link selects the run and opens `LinkPopover`; Ctrl/Cmd+click opens the URL in a new tab (`cursor: pointer` on links while Ctrl/Cmd is held, otherwise text caret). While the popover is open, `linkDraftRange` paints a `bg-teal-200/70` draft highlight so the target text stays visible after focus moves to the URL field. Collapsed-caret Bold/Italic uses `document.execCommand` so the browser keeps sticky typing; a non-collapsed selection toggles marks via the span model (`toggleMark`). Toolbar chips call `onPrepare` to snapshot the logical selection before `mousedown` steals focus; link Apply restores that snapshot. Shortcuts: Ctrl/Cmd+B, I, K. Typography classes come from public `TextBlock` maps. Accepts `dir` for per-tab content direction.

#### `FormatToolbar` (`components/admin/format-toolbar.tsx`) + `LinkPopover`

Shown above the selected text or list block. **Bold / Italic / Link** chips (`rounded-button`; pressed = `bg-teal-700 text-sand-50`). Sticky/selection state drives `aria-pressed`. Optional `onPrepare` runs on chip `mousedown` before `preventDefault` so the editor can snapshot the selection. Link opens `LinkPopover` (URL field + Apply + Remove)  -  no `window.prompt`, no Unlink chip. Popover chrome uses `mousedown preventDefault` except on `input` / `textarea` / `button` so the URL field stays focusable. Apply accepts `http(s)` URLs and bare domains (prepends `https://`); Enter in the URL field Applies and does not submit the site form. Invalid Apply shows `linkInvalidUrl` and keeps the popover open. While open, canvas passes `linkDraftRange` so the target run stays highlighted. Remove clears `href`. Labels under `admin.siteForm.block.*` (`linkUrl` / `linkApply` / `linkRemove` / `linkInvalidUrl`).

#### `BlockCanvas` (`components/admin/block-canvas.tsx`)

Single **white** document surface: `rounded-card`, `border-brown-800/15`, `px-6 py-8` / `md:px-10 md:py-10`. Renders blocks like the public article body; no per-block move/delete chrome.

| Element | Spec |
|---|---|
| Text (HEADING/PARAGRAPH) | `SpanTextEditor` (`contenteditable`) with typography from public `TextBlock` maps (`roleClasses` / `colorClasses` / `alignClasses` in `text-block.tsx`); when selected, `FormatToolbar` + `LinkPopover` above the block |
| Format toolbar | `FormatToolbar` chips Bold / Italic / Link with pressed state; `LinkPopover` for URL apply/remove; i18n under `admin.siteForm.block.*` |
| Image / Audio | `MediaFilePicker` on canvas (pick/change/remove); **caption not on canvas**; audio shows playable `<audio controls>` when `previewUrl` is set (saved `/uploads/...` or local `blob:`) |
| Video | Valid `http(s)` embed → playable `aspect-video` iframe (`pointer-events` enabled, click does not deselect via stopPropagation); else dashed placeholder labeled with embed URL copy |
| Selected block | Wrapper `ring-2 ring-teal-700/40`, `rounded-button`, `-m-1 p-1`; **drag handle** (6-dot grip, white chip, `cursor-grab`) above content  -  only when selected; HTML5 DnD reorders via `reorderBlock` (handle is `draggable`, not the text editor) |
| Drop target | While dragging, target block gets stronger `ring-teal-700/60`; dragged block `opacity-60` |
| Insert gaps | Before each block and at the end: centered **+** via `BlockInsertMenu` (`variant="gap"` / `"end"`)  -  white 36×36, `border-2 border-brown-800/20`, bold **+** (`aria-label` = `labels.addBlock`) |
| Empty list | **15px** `brown-600` hint (`labels.empty`) above end insert |

#### `BlockInsertMenu` (`components/admin/block-insert-menu.tsx`)

Portaled menu (`fixed`, `zIndex: 1100`)  -  Heading / Paragraph / **List** / Image / Audio / Video. Gap and end triggers are the same icon-only **+** button. Uses shared `measurePortalMenu` (flip-up + scrollable `maxHeight`) so end-of-canvas inserts stay on screen.

#### `ListBlock` (`components/public/content-blocks/list-block.tsx` + editor canvas/inspector)

Bulleted or numbered lists for recipes and steps. Stored as `ContentBlockType.LIST` with `listStyle` (`BULLET` \| `NUMBERED`) and `items: [{ spans }]`. Canvas: one `FormatToolbar` at the **top of the list block** (not per item); each item is a `SpanTextEditor`. **Enter** splits / creates the next item; **Shift+Enter** inserts a soft line break in the same item; **Backspace** at the start of an item merges with the previous (or removes an empty first sibling). Inspector toggles bullet vs numbered and add/remove items.

#### `CategoryCover` (`components/ui/category-cover.tsx`)

Default cover when `coverUrl` is null (public `SiteCard`, admin sites-list thumbs). Full-bleed brown→teal gradient + one line icon per category (`HISTORICAL` arch, `HANDICRAFT` giveh-like form, `STREET` street facade, `LANDMARK` map pin, `FOOD` bowl). Icons use `brown-800/70` stroke; no emoji.

### Public member auth + site reviews

| Surface | Spec |
|---|---|
| Sign up / sign in | `(public)/signup` and `(public)/login`; use the **public layout shell** (header with language switcher, footer, page background). Page body is only the centered sand card (`max-w-md`); no duplicate footer or language control on the page |
| Sign up / sign in | `(public)/signup` and `(public)/login`; public layout shell only; centered sand card (`max-w-md`) |
| Member profile | `(public)/profile`; `ReviewAvatar` header; `MemberProfileForm` (PATCH `/auth/me`); `MemberReviewsList` (GET `/auth/me/reviews`) |
| Site reviews block | Below article on `/sites/[slug]`; compose white card when signed in; `ReviewCard` list with avatar, like row; `ReviewLikeButton` for members |
| Review form (signed in) | `TextArea` + Save / Remove `ActionButton`s; success `text-teal-700`, errors `#B44B3D` |

#### `BlockInspector` (`components/admin/block-inspector.tsx`)

Type, style, media, caption, embed URL, reorder, delete  -  **not** on the canvas.

| Element | Spec |
|---|---|
| Desktop (`md+`, ≥700px) | Sticky aside `w-[280px]`, white `rounded-card`, `border-brown-800/15`, `p-4`, `top-4`; empty state: **15px** `brown-600` (`labels.inspectorEmpty`) |
| Mobile (`<700px`) | Bottom sheet when a block is selected: `fixed` bottom, `z-[1100]`, `max-h-[75vh]`, `rounded-t-card`, header = type title + `ghost` close (`labels.closeInspector`) |
| All types | `Select` block type → `convertBlockType` |
| Text | `Select`s for `textRole` / `colorToken` / `align` (Start \| Center \| End  -  same options as §10) |
| Image / Audio | `TextInput` caption + `MediaFilePicker` |
| Video | `TextInput` caption + `TextInput dir="ltr"` embed URL |
| Actions | `ghost` move up / move down (disabled at ends) + delete; top border `border-brown-800/10` |

### `SiteForm` (`components/admin/site-form.tsx`)

Full-width admin editor for creating/replacing a site. Reads all copy from `useTranslations('admin.siteForm')` (no `labels` prop  -  pages render `<SiteForm />` / `<SiteForm site={site} />`).

| Element | Spec |
|---|---|
| Shared meta | `slug` (`dir="ltr"`, editable on create and update with reprint warning), `category`/`city` `Select`s, `LocationMapPicker` + `lat`/`lng` `TextInput`s, cover via `ImagePicker` (`isActive` not edited here  -  create defaults `true`, edit preserves existing) |
| Locale content | Three `Tabs` from `CONTENT_LOCALE_DEFINITIONS` (فارسی / English / العربية  -  native endonyms, not next-intl labels); each tab = title + short-description `Field`s with permanent `contentDir` (`rtl` for FA+AR, `ltr` for EN) + document-canvas `BlockListEditor` |
| Copy from FA | EN and AR tabs each show a `secondary` `ActionButton` "Copy from Persian" (right-aligned above the editor); `window.confirm` when the target tab already has blocks |
| Undo / redo | Per active content tab only (`lib/tab-history.ts`): Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo; coalesces typing bursts (~300ms) |
| Save | One atomic multipart request: `POST /admin/sites` (create) or `PUT /admin/sites/:id` (replace). `payload` requires fa/en/ar translations; text blocks send `spans` (empty plain-text blocks omitted). Each staged file is optimized (images via `lib/optimize-image.ts`) then hashed (`lib/file-hash.ts`). A hash matching an existing `site.media[].contentHash` → reference by `mediaId` (no upload); otherwise the file is appended once with the multipart **field name === its `clientFileKey`** and identical picks are deduped onto that one part (cover processed first). The old dual JSON + `.../cover` mutation path is removed |

### Language switcher

- Compact **dropdown**: white trigger, `border-brown-800/25`, teal code chip + native name + 20px `ChevronIcon`; menu white with stronger shadow
- Menu: **portaled** to `document.body` (`fixed`, `zIndex: 1100`, same stacking rule as `Select`); scrollable; flip-up + viewport clamp via `lib/measure-portal-menu.ts`; each row = code chip + native name
- Active row: teal-700 fill / sand-50 text (same pattern as `Select`)
- Locale catalog: `i18n/locales.ts` (`LOCALE_DEFINITIONS`)  -  add code + nativeName + dir + messages JSON when shipping a language
- Current UI locales: `fa` (default, no prefix), `en`, `ar` (RTL)

### Form field contrast

- On `sand-100` panels, controls use **white** fill + `border-brown-800/25` (TextInput, Select, ImagePicker, Checkbox off-state). Avoid `sand-50` nested in `sand-100`  -  contrast is too low on the striped page background.

Components: `language-switcher.tsx` (public header, admin header, admin login).

Admin composed components: `admin-shell.tsx`, `login-form.tsx`, `sites-list.tsx`, `site-form.tsx`, `admin-site-qr-panel.tsx`, `visit-stats-panel.tsx`, `block-list-editor.tsx`, `block-canvas.tsx`, `block-inspector.tsx`, `block-insert-menu.tsx`, `span-text-editor.tsx`, `format-toolbar.tsx`, `media-file-picker.tsx`, `users-panel.tsx`, `location-map-picker.tsx`.


## Open questions

- [ ] Icon set: which library (Lucide/Phosphor) fits the palette best?
- [ ] Single-color logo version for printing on physical plaques
