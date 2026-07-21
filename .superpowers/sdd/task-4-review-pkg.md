BASE: a7df60c50b4d10e650e29724b4ff5042a6316af3
HEAD: 397c372a85d29cbd86e858e9187efcca2acb4ae7

## Commits

397c372 Register Arabic in UI routing and locale catalog.
93e08d7 Render rich spans and caption/slug alts; use Arabic site content.

## Stat

 apps/web/app/[locale]/(public)/page.tsx            |  6 +-
 .../app/[locale]/(public)/sites/[slug]/page.tsx    |  2 +-
 .../public/content-blocks/audio-block.tsx          |  8 +-
 .../public/content-blocks/block-renderer.tsx       |  6 +-
 .../public/content-blocks/image-block.tsx          |  7 +-
 .../public/content-blocks/text-block.test.tsx      | 34 ++++++++
 .../public/content-blocks/text-block.tsx           | 18 +++++
 .../public/content-blocks/video-block.tsx          | 10 +--
 apps/web/components/public/site-card.test.tsx      | 24 ++++++
 apps/web/components/public/site-card.tsx           |  2 +-
 apps/web/i18n/direction.ts                         |  6 +-
 apps/web/i18n/locales.test.ts                      | 51 ++++++++++++
 apps/web/i18n/locales.ts                           | 91 ++++++++++++++++++++++
 apps/web/i18n/routing.ts                           |  2 +-
 14 files changed, 236 insertions(+), 31 deletions(-)

## Diff
```diff

diff --git a/apps/web/app/[locale]/(public)/page.tsx b/apps/web/app/[locale]/(public)/page.tsx
index 417857f..edcae88 100644
--- a/apps/web/app/[locale]/(public)/page.tsx
+++ b/apps/web/app/[locale]/(public)/page.tsx
@@ -20,17 +20,17 @@ export default async function HomePage({ params }: PageProps) {
   setRequestLocale(locale);
 
   const t = await getTranslations('home');
   const landing = await getLanding();
   const steps = t.raw('how.steps') as Array<{ title: string; body: string }>;
   const heroImageSrc = heritageImages.hero.src;
-  const heroAlt = locale === 'fa' ? heritageImages.hero.altFa : heritageImages.hero.altEn;
+  const heroAlt = locale === 'en' ? heritageImages.hero.altEn : heritageImages.hero.altFa;
   const bannerTopAlt =
-    locale === 'fa' ? heritageImages.bannerTop.altFa : heritageImages.bannerTop.altEn;
+    locale === 'en' ? heritageImages.bannerTop.altEn : heritageImages.bannerTop.altFa;
   const bannerMidAlt =
-    locale === 'fa' ? heritageImages.bannerMid.altFa : heritageImages.bannerMid.altEn;
+    locale === 'en' ? heritageImages.bannerMid.altEn : heritageImages.bannerMid.altFa;
   const qrUrl = buildPlaqueQrUrl('taq-e-bostan');
   const plaqueDownloadUrl = buildSiteQrPngUrl('taq-e-bostan');
   const tQr = await getTranslations('site.qr');
 
   return (
     <>
diff --git a/apps/web/app/[locale]/(public)/sites/[slug]/page.tsx b/apps/web/app/[locale]/(public)/sites/[slug]/page.tsx
index a46fc7e..2c385b7 100644
--- a/apps/web/app/[locale]/(public)/sites/[slug]/page.tsx
+++ b/apps/web/app/[locale]/(public)/sites/[slug]/page.tsx
@@ -19,13 +19,13 @@ type PageProps = {
 };
 
 export async function generateStaticParams() {
   try {
     const landing = await getLanding();
     return landing.sites.flatMap((site) =>
-      ['fa', 'en'].map((locale) => ({ locale, slug: site.slug })),
+      ['fa', 'en', 'ar'].map((locale) => ({ locale, slug: site.slug })),
     );
   } catch {
     return [];
   }
 }
 
diff --git a/apps/web/components/public/content-blocks/audio-block.tsx b/apps/web/components/public/content-blocks/audio-block.tsx
index ab73413..717e2c3 100644
--- a/apps/web/components/public/content-blocks/audio-block.tsx
+++ b/apps/web/components/public/content-blocks/audio-block.tsx
@@ -1,24 +1,20 @@
 import type { MediaRef } from '@heritage/shared-types';
-import type { Locale } from '@heritage/shared-types';
 
 type AudioBlockProps = {
   media: MediaRef;
   caption: string | null;
-  locale: Locale;
 };
 
-export function AudioBlock({ media, caption, locale }: AudioBlockProps) {
-  const label = locale === 'fa' ? media.altFa ?? caption : media.altEn ?? caption;
-
+export function AudioBlock({ media, caption }: AudioBlockProps) {
   if (!media.url) return null;
 
   return (
     <figure className="mx-auto w-full max-w-lg text-center">
       <div className="overflow-hidden rounded-card bg-sand-100 p-4 ring-1 ring-brown-800/10">
-        <audio controls className="w-full" src={media.url} aria-label={label ?? undefined}>
+        <audio controls className="w-full" src={media.url} aria-label={caption ?? undefined}>
           <track kind="captions" />
         </audio>
       </div>
       {caption ? <figcaption className="mt-2 text-[14px] text-brown-800">{caption}</figcaption> : null}
     </figure>
   );
diff --git a/apps/web/components/public/content-blocks/block-renderer.tsx b/apps/web/components/public/content-blocks/block-renderer.tsx
index 38b570c..6baf4ef 100644
--- a/apps/web/components/public/content-blocks/block-renderer.tsx
+++ b/apps/web/components/public/content-blocks/block-renderer.tsx
@@ -23,19 +23,19 @@ export function BlockRenderer({ blocks, locale, siteSlug }: BlockRendererProps)
               colorToken={block.colorToken}
               align={block.align}
               spans={block.spans}
             />
           ) : null}
           {block.type === 'IMAGE' ? (
-            <ImageBlock media={block.media} caption={block.caption} locale={locale} siteSlug={siteSlug} />
+            <ImageBlock media={block.media} caption={block.caption} siteSlug={siteSlug} />
           ) : null}
           {block.type === 'AUDIO' ? (
-            <AudioBlock media={block.media} caption={block.caption} locale={locale} />
+            <AudioBlock media={block.media} caption={block.caption} />
           ) : null}
           {block.type === 'VIDEO' ? (
-            <VideoBlock media={block.media} caption={block.caption} locale={locale} />
+            <VideoBlock media={block.media} caption={block.caption} />
           ) : null}
         </RevealOnScroll>
       ))}
     </div>
   );
 }
diff --git a/apps/web/components/public/content-blocks/image-block.tsx b/apps/web/components/public/content-blocks/image-block.tsx
index 75825ef..d2b1022 100644
--- a/apps/web/components/public/content-blocks/image-block.tsx
+++ b/apps/web/components/public/content-blocks/image-block.tsx
@@ -1,30 +1,27 @@
 import Image from 'next/image';
 import type { MediaRef } from '@heritage/shared-types';
-import type { Locale } from '@heritage/shared-types';
 import { resolveMediaUrl } from '@/lib/media-url';
 
 type ImageBlockProps = {
   media: MediaRef;
   caption: string | null;
-  locale: Locale;
   siteSlug: string;
 };
 
-export function ImageBlock({ media, caption, locale, siteSlug }: ImageBlockProps) {
-  const alt = locale === 'fa' ? media.altFa ?? media.altEn ?? '' : media.altEn ?? media.altFa ?? '';
+export function ImageBlock({ media, caption, siteSlug }: ImageBlockProps) {
   const src = resolveMediaUrl(media.url, siteSlug);
 
   if (!src) return null;
 
   return (
     <figure className="mx-auto flex max-w-lg flex-col items-center text-center">
       <div className="inline-block max-w-full overflow-hidden rounded-card bg-sand-100 p-2 ring-1 ring-brown-800/10">
         <Image
           src={src}
-          alt={alt}
+          alt={caption ?? ''}
           width={640}
           height={480}
           className="mx-auto h-auto max-h-80 w-auto max-w-full object-contain"
           sizes="(max-width: 768px) 90vw, 512px"
           unoptimized={src.endsWith('.webp')}
         />
diff --git a/apps/web/components/public/content-blocks/text-block.test.tsx b/apps/web/components/public/content-blocks/text-block.test.tsx
index 3b03637..a4e4228 100644
--- a/apps/web/components/public/content-blocks/text-block.test.tsx
+++ b/apps/web/components/public/content-blocks/text-block.test.tsx
@@ -21,7 +21,41 @@ describe('TextBlock', () => {
 
     const paragraph = screen.getByText(/Plain/).closest('p');
     expect(paragraph).toHaveClass('text-teal-700');
     expect(screen.getByText('bold').tagName).toBe('STRONG');
     expect(screen.getByText('italic').tagName).toBe('EM');
   });
+
+  it('renders href spans as teal links after bold/italic wrappers', () => {
+    render(
+      <TextBlock
+        type="PARAGRAPH"
+        textRole="BODY"
+        colorToken="BROWN_800"
+        align="START"
+        spans={[
+          { text: 'Visit ', bold: true, href: 'https://example.com' },
+          { text: 'plain' },
+        ]}
+      />,
+    );
+
+    const link = screen.getByRole('link', { name: 'Visit' });
+    expect(link).toHaveAttribute('href', 'https://example.com');
+    expect(link).toHaveClass('font-bold', 'text-teal-700', 'hover:text-teal-500');
+    expect(link.querySelector('strong')).not.toBeNull();
+  });
+
+  it('applies text-end for END align', () => {
+    render(
+      <TextBlock
+        type="HEADING"
+        textRole="H2"
+        colorToken="BROWN_950"
+        align="END"
+        spans={[{ text: 'Aligned' }]}
+      />,
+    );
+
+    expect(screen.getByRole('heading', { level: 2 })).toHaveClass('text-end');
+  });
 });
diff --git a/apps/web/components/public/content-blocks/text-block.tsx b/apps/web/components/public/content-blocks/text-block.tsx
index 6c388bd..bbecbd5 100644
--- a/apps/web/components/public/content-blocks/text-block.tsx
+++ b/apps/web/components/public/content-blocks/text-block.tsx
@@ -17,32 +17,50 @@ const colorClasses: Record<ColorToken, string> = {
   SAND_50: 'text-sand-50',
 };
 
 const alignClasses: Record<BlockAlign, string> = {
   START: 'text-start',
   CENTER: 'text-center',
+  END: 'text-end',
 };
 
 type TextBlockProps = {
   type: 'HEADING' | 'PARAGRAPH';
   textRole: TextRole;
   colorToken: ColorToken;
   align: BlockAlign;
   spans: TextSpan[];
 };
 
+function isExternalHttpUrl(href: string): boolean {
+  return /^https?:\/\//i.test(href);
+}
+
 export function TextBlock({ type, textRole, colorToken, align, spans }: TextBlockProps) {
   const className = `${roleClasses[textRole]} ${colorClasses[colorToken]} ${alignClasses[align]}`;
   const Tag = type === 'HEADING' ? 'h2' : 'p';
 
   return (
     <Tag className={className}>
       {spans.map((span, index) => {
         let content: ReactNode = span.text;
         if (span.bold) content = <strong>{content}</strong>;
         if (span.italic) content = <em>{content}</em>;
+        if (span.href) {
+          content = (
+            <a
+              href={span.href}
+              className="font-bold text-teal-700 hover:text-teal-500"
+              {...(isExternalHttpUrl(span.href)
+                ? { target: '_blank', rel: 'noopener noreferrer' }
+                : {})}
+            >
+              {content}
+            </a>
+          );
+        }
         return <span key={`${index}-${span.text.slice(0, 8)}`}>{content}</span>;
       })}
     </Tag>
   );
 }
 
diff --git a/apps/web/components/public/content-blocks/video-block.tsx b/apps/web/components/public/content-blocks/video-block.tsx
index 4be1f11..f1124f6 100644
--- a/apps/web/components/public/content-blocks/video-block.tsx
+++ b/apps/web/components/public/content-blocks/video-block.tsx
@@ -1,26 +1,24 @@
 import type { MediaRef } from '@heritage/shared-types';
-import type { Locale } from '@heritage/shared-types';
 
 type VideoBlockProps = {
   media: MediaRef;
   caption: string | null;
-  locale: Locale;
 };
 
-export function VideoBlock({ media, caption, locale }: VideoBlockProps) {
-  const title = locale === 'fa' ? media.altFa ?? caption : media.altEn ?? caption;
+export function VideoBlock({ media, caption }: VideoBlockProps) {
+  const label = caption ?? '';
 
   if (media.embedUrl) {
     return (
       <figure className="mx-auto w-full max-w-2xl text-center">
         <div className="overflow-hidden rounded-card ring-1 ring-brown-800/10">
           <div className="relative aspect-video w-full bg-brown-950">
             <iframe
               src={media.embedUrl}
-              title={title ?? 'Video'}
+              title={label || 'Video'}
               className="absolute inset-0 h-full w-full border-0"
               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
               allowFullScreen
             />
           </div>
         </div>
@@ -35,13 +33,13 @@ export function VideoBlock({ media, caption, locale }: VideoBlockProps) {
     <figure className="mx-auto w-full max-w-2xl text-center">
       <div className="overflow-hidden rounded-card ring-1 ring-brown-800/10">
         <video
           controls
           className="mx-auto w-full rounded-card bg-brown-950"
           src={media.url}
-          aria-label={title ?? undefined}
+          aria-label={label || undefined}
         />
       </div>
       {caption ? <figcaption className="mt-2 text-[14px] text-brown-800">{caption}</figcaption> : null}
     </figure>
   );
 }
diff --git a/apps/web/components/public/site-card.test.tsx b/apps/web/components/public/site-card.test.tsx
index 94893ef..fb72167 100644
--- a/apps/web/components/public/site-card.test.tsx
+++ b/apps/web/components/public/site-card.test.tsx
@@ -35,7 +35,31 @@ describe('SiteCard', () => {
     );
 
     const link = screen.getByRole('link', { name: /+++º+é +¿+¦+¬+º+å/i });
     expect(link).toHaveAttribute('href', '/sites/taq-e-bostan');
     expect(screen.getByText('+¬+ê+¦¦î+¡ +¬+ê+¬+º+ç')).toBeInTheDocument();
   });
+
+  it('uses site slug as cover image alt text', () => {
+    render(
+      <SiteCard
+        locale="en"
+        site={{
+          slug: 'taq-e-bostan',
+          category: 'ANCIENT',
+          coverUrl: '/media/taq-e-bostan/cover.webp',
+          city: { slug: 'kermanshah-city', nameFa: '+¬+¦+à+º+å+¦+º+ç', nameEn: 'Kermanshah' },
+          province: { slug: 'kermanshah', nameFa: '+¬+¦+à+º+å+¦+º+ç', nameEn: 'Kermanshah' },
+          translations: [
+            {
+              locale: 'en',
+              title: 'Taq-e Bostan',
+              shortDescription: 'Short description',
+            },
+          ],
+        }}
+      />,
+    );
+
+    expect(screen.getByRole('img', { name: 'taq-e-bostan' })).toBeInTheDocument();
+  });
 });
diff --git a/apps/web/components/public/site-card.tsx b/apps/web/components/public/site-card.tsx
index bfe0ec7..383549e 100644
--- a/apps/web/components/public/site-card.tsx
+++ b/apps/web/components/public/site-card.tsx
@@ -19,13 +19,13 @@ export function SiteCard({ site, locale }: SiteCardProps) {
     <Link href={`/sites/${site.slug}`} className="group block transition-transform hover:-translate-y-0.5">
       <HeritageCard className="h-full overflow-hidden">
         <div className="relative h-[150px] bg-linear-to-br from-teal-700/20 to-brown-800/20">
           {coverSrc ? (
             <Image
               src={coverSrc}
-              alt={translation.title}
+              alt={site.slug}
               fill
               className="object-cover"
               sizes="(max-width: 900px) 100vw, 33vw"
               unoptimized={coverSrc.endsWith('.webp')}
             />
           ) : null}
diff --git a/apps/web/i18n/direction.ts b/apps/web/i18n/direction.ts
index 2167600..6381c8a 100644
--- a/apps/web/i18n/direction.ts
+++ b/apps/web/i18n/direction.ts
@@ -1,5 +1 @@
-import type { Locale } from './routing';
-
-export function getDir(locale: Locale): 'rtl' | 'ltr' {
-  return locale === 'fa' ? 'rtl' : 'ltr';
-}
+export { getDir } from './locales';
diff --git a/apps/web/i18n/locales.test.ts b/apps/web/i18n/locales.test.ts
new file mode 100644
index 0000000..65ddae0
--- /dev/null
+++ b/apps/web/i18n/locales.test.ts
@@ -0,0 +1,51 @@
+import { describe, expect, it } from 'vitest';
+import {
+  CONTENT_LOCALE_DEFINITIONS,
+  LOCALE_DEFINITIONS,
+  getDir,
+  localePathPrefix,
+  localizedPath,
+  toContentLocale,
+} from './locales';
+import { routing } from './routing';
+
+describe('content locales', () => {
+  it('maps fa, en, and ar to themselves (no arGåÆfa collapse)', () => {
+    expect(toContentLocale('fa')).toBe('fa');
+    expect(toContentLocale('en')).toBe('en');
+    expect(toContentLocale('ar')).toBe('ar');
+  });
+
+  it('includes Arabic in content locale definitions', () => {
+    expect(CONTENT_LOCALE_DEFINITIONS.ar).toEqual({
+      code: 'ar',
+      nativeName: '+º+ä+¦+¦+¿+è+¬',
+      dir: 'rtl',
+    });
+  });
+});
+
+describe('UI locale catalog', () => {
+  it('includes ar in routing and locale definitions', () => {
+    expect(routing.locales).toContain('ar');
+    expect(LOCALE_DEFINITIONS.ar).toEqual({
+      code: 'ar',
+      nativeName: '+º+ä+¦+¦+¿+è+¬',
+      numberLocale: 'ar',
+      dir: 'rtl',
+    });
+  });
+
+  it('marks fa and ar as rtl', () => {
+    expect(getDir('fa')).toBe('rtl');
+    expect(getDir('ar')).toBe('rtl');
+    expect(getDir('en')).toBe('ltr');
+  });
+
+  it('omits prefix for default locale', () => {
+    expect(localePathPrefix('fa')).toBe('');
+    expect(localePathPrefix('en')).toBe('/en');
+    expect(localePathPrefix('ar')).toBe('/ar');
+    expect(localizedPath('ar', '/admin/login')).toBe('/ar/admin/login');
+  });
+});
diff --git a/apps/web/i18n/locales.ts b/apps/web/i18n/locales.ts
new file mode 100644
index 0000000..cc63002
--- /dev/null
+++ b/apps/web/i18n/locales.ts
@@ -0,0 +1,91 @@
+import { routing, type Locale as UiLocale } from './routing';
+import type { Locale } from '@heritage/shared-types';
+
+export type LocaleDirection = 'rtl' | 'ltr';
+
+export type LocaleDefinition = {
+  code: UiLocale;
+  /** Native endonym shown in the switcher (+ü+º+¦+¦¦î, English, +º+ä+¦+¦+¿+è+¬). */
+  nativeName: string;
+  /** BCP 47 tag for number/date formatting. */
+  numberLocale: string;
+  dir: LocaleDirection;
+};
+
+/**
+ * UI locale catalog GÇö add an entry here + `messages/{code}.json` + routing.locales
+ * when shipping a new language. Content locales (SiteTranslation) may lag behind.
+ */
+export const LOCALE_DEFINITIONS: Record<UiLocale, LocaleDefinition> = {
+  fa: {
+    code: 'fa',
+    nativeName: '+ü+º+¦+¦¦î',
+    numberLocale: 'fa-IR',
+    dir: 'rtl',
+  },
+  en: {
+    code: 'en',
+    nativeName: 'English',
+    numberLocale: 'en-US',
+    dir: 'ltr',
+  },
+  ar: {
+    code: 'ar',
+    nativeName: '+º+ä+¦+¦+¿+è+¬',
+    numberLocale: 'ar',
+    dir: 'rtl',
+  },
+};
+
+export function getLocaleDefinition(locale: string): LocaleDefinition {
+  if (locale in LOCALE_DEFINITIONS) {
+    return LOCALE_DEFINITIONS[locale as UiLocale];
+  }
+  return LOCALE_DEFINITIONS[routing.defaultLocale];
+}
+
+export function getDir(locale: string): LocaleDirection {
+  return getLocaleDefinition(locale).dir;
+}
+
+/** Path prefix for non-default locales (`/en`, `/ar`); empty for default `fa`. */
+export function localePathPrefix(locale: string): string {
+  if (locale === routing.defaultLocale || !(routing.locales as readonly string[]).includes(locale)) {
+    return '';
+  }
+  return `/${locale}`;
+}
+
+export function localizedPath(locale: string, path: string): string {
+  const normalized = path.startsWith('/') ? path : `/${path}`;
+  return `${localePathPrefix(locale)}${normalized}`;
+}
+
+/**
+ * Site content locales (`SiteTranslation`) GÇö independent of the UI locale catalog.
+ * Tab labels use `nativeName` (never next-intl); panels/canvas use permanent `dir`.
+ */
+export type ContentLocaleCode = Locale;
+
+export type ContentLocaleDefinition = {
+  code: ContentLocaleCode;
+  /** Permanent endonym for content tabs (+ü+º+¦+¦¦î / English / +º+ä+¦+¦+¿+è+¬) GÇö not UI-translated. */
+  nativeName: string;
+  dir: LocaleDirection;
+};
+
+export const CONTENT_LOCALE_DEFINITIONS: Record<ContentLocaleCode, ContentLocaleDefinition> = {
+  fa: { code: 'fa', nativeName: '+ü+º+¦+¦¦î', dir: 'rtl' },
+  en: { code: 'en', nativeName: 'English', dir: 'ltr' },
+  ar: { code: 'ar', nativeName: '+º+ä+¦+¦+¿+è+¬', dir: 'rtl' },
+};
+
+export const CONTENT_LOCALES = Object.keys(
+  CONTENT_LOCALE_DEFINITIONS,
+) as ContentLocaleCode[];
+
+/** Map UI locale GåÆ site content locale (fa | en | ar). */
+export function toContentLocale(locale: string): ContentLocaleCode {
+  if (locale === 'en' || locale === 'ar') return locale;
+  return 'fa';
+}
diff --git a/apps/web/i18n/routing.ts b/apps/web/i18n/routing.ts
index e8d51ad..754c0f8 100644
--- a/apps/web/i18n/routing.ts
+++ b/apps/web/i18n/routing.ts
@@ -1,10 +1,10 @@
 import { defineRouting } from 'next-intl/routing';
 
 export const routing = defineRouting({
-  locales: ['fa', 'en'],
+  locales: ['fa', 'en', 'ar'],
   defaultLocale: 'fa',
   localePrefix: 'as-needed',
   localeDetection: false,
 });
 
 export type Locale = (typeof routing.locales)[number];
```
