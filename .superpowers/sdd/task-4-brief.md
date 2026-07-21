### Task 4: Public web â€” caption/slug alts, links, END, real `ar` content

**Files:**
- Modify: `apps/web/i18n/locales.ts`, `apps/web/i18n/locales.test.ts`
- Modify: `apps/web/lib/sites.ts` (+ tests if present)
- Modify: `apps/web/components/public/content-blocks/text-block.tsx` (+ `text-block.test.tsx`)
- Modify: `apps/web/components/public/content-blocks/image-block.tsx`
- Modify: `apps/web/components/public/content-blocks/audio-block.tsx`
- Modify: `apps/web/components/public/content-blocks/video-block.tsx`
- Modify: `apps/web/components/public/content-blocks/block-renderer.tsx`
- Modify: `apps/web/components/public/site-card.tsx` (+ test)
- Modify: `apps/web/app/[locale]/(public)/page.tsx` only if it still uses `toContentLocale` for site content (heritage-images alts stay fa/en static â€” for `ar` UI use `altFa` or add `altAr` on static assets only if needed; **spec says leave heritage-images as-is** â€” for Arabic landing banners keep using `altFa` as fallback in page.tsx ternary: `locale === 'en' ? altEn : altFa`)

**Interfaces:**
- `CONTENT_LOCALE_DEFINITIONS` includes `ar: { nativeName: 'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©', dir: 'rtl' }`
- `toContentLocale(locale)` returns `'fa'|'en'|'ar'` with **identity** for those three (no arâ†’fa)
- `alignClasses.END = 'text-end'`
- Text spans with `href` wrap content in `<a className="font-bold text-teal-700 hover:text-teal-500">` (after bold/italic wrappers)
- Image: `alt={caption ?? ''}`; Audio/Video: `aria-label={caption ?? ''}`
- Site card: `alt={site.slug}` on cover img

- [ ] **Step 1: Failing tests** â€” extend `text-block.test.tsx` for href + END; `locales.test.ts` expects `toContentLocale('ar') === 'ar'`; site-card test expects cover alt = slug.

- [ ] **Step 2: Implement** public + locales changes.

- [ ] **Step 3: Run** `pnpm --filter web test` â€” PASS for touched tests.

- [ ] **Step 4: Commit**

```bash
git add apps/web/i18n apps/web/lib/sites.ts apps/web/components/public apps/web/app
git commit -m "Render rich spans and caption/slug alts; use Arabic site content."
```

---


