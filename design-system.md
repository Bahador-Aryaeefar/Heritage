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

## Open questions

- [ ] Icon set: which library (Lucide/Phosphor) fits the palette best?
- [ ] Single-color logo version for printing on physical plaques
