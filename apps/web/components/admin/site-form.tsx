'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@/i18n/navigation';
import {
  adminSiteSchema,
  cityOptionSchema,
  createSiteFullSchema,
  paginatedResponseSchema,
  updateSiteFullSchema,
  type AdminBlockWrite,
  type AdminSite,
  type CreateSiteFullInput,
  type SiteCategory,
} from '@heritage/shared-types';
import { ActionButton } from '@/components/ui/action-button';
import { ImagePicker } from '@/components/ui/image-picker';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { Field, TextArea, TextInput } from '@/components/ui/text-field';
import {
  BlockListEditor,
  type BlockListEditorLabels,
} from '@/components/admin/block-list-editor';
import { AdminSiteQrPanel } from '@/components/admin/admin-site-qr-panel';
import {
  copyBlocksFromFa,
  createBlockKey,
  type EditorAudioBlock,
  type EditorBlock,
  type EditorImageBlock,
} from '@/lib/copy-blocks-from-fa';
import { adminFetch, adminFetchVoid } from '@/lib/admin-api';
import { sha256HexOfFile } from '@/lib/file-hash';
import { optimizeImage } from '@/lib/optimize-image';
import { createTabHistory, type TabHistory } from '@/lib/tab-history';
import { spansToPlainText } from '@/lib/text-spans';
import { env } from '@/env';
import {
  CONTENT_LOCALE_DEFINITIONS,
  CONTENT_LOCALES,
  type ContentLocaleCode,
} from '@/i18n/locales';
import type { Locale } from '@/i18n/routing';

const LocationMapPicker = dynamic(
  () =>
    import('@/components/admin/location-map-picker').then((mod) => mod.LocationMapPicker),
  { ssr: false },
);

const citiesSchema = paginatedResponseSchema(cityOptionSchema);

type MediaRef = { mediaId?: string; clientFileKey?: string; contentHash?: string };

type TabSnapshot = {
  title: string;
  shortDescription: string;
  blocks: EditorBlock[];
};

type SiteFormProps = {
  site?: AdminSite;
};

/** Read shape (`AdminSite.translations[].blocks`) → the editor's `EditorBlock` union. */
function toEditorBlocks(blocks: AdminSite['translations'][number]['blocks']): EditorBlock[] {
  return blocks.map((block): EditorBlock => {
    switch (block.type) {
      case 'HEADING':
      case 'PARAGRAPH':
        return {
          key: createBlockKey(),
          type: block.type,
          spans: block.spans.map((span) => ({ ...span })),
          textRole: block.textRole,
          colorToken: block.colorToken,
          align: block.align,
        };
      case 'IMAGE':
        return {
          key: createBlockKey(),
          type: 'IMAGE',
          caption: block.caption ?? '',
          mediaId: block.media.id,
          ...(block.media.url ? { previewUrl: block.media.url } : {}),
        };
      case 'AUDIO':
        return {
          key: createBlockKey(),
          type: 'AUDIO',
          caption: block.caption ?? '',
          mediaId: block.media.id,
          ...(block.media.url ? { previewUrl: block.media.url } : {}),
        };
      case 'VIDEO':
        return {
          key: createBlockKey(),
          type: 'VIDEO',
          caption: block.caption ?? '',
          embedUrl: block.media.embedUrl ?? '',
          mediaId: block.media.id,
        };
    }
  });
}

function initialBlocks(site: AdminSite | undefined, locale: ContentLocaleCode): EditorBlock[] {
  const translation = site?.translations.find((t) => t.locale === locale);
  return translation ? toEditorBlocks(translation.blocks) : [];
}

function initialTitle(site: AdminSite | undefined, locale: ContentLocaleCode): string {
  return site?.translations.find((t) => t.locale === locale)?.title ?? '';
}

function initialShort(site: AdminSite | undefined, locale: ContentLocaleCode): string {
  return site?.translations.find((t) => t.locale === locale)?.shortDescription ?? '';
}

export function SiteForm({ site }: SiteFormProps) {
  const router = useRouter();
  const uiLocale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const t = useTranslations('admin.siteForm');
  const tb = useTranslations('admin.siteForm.block');
  const isEdit = Boolean(site);
  const formRef = useRef<HTMLFormElement>(null);

  const { data: cities } = useQuery({
    queryKey: ['admin', 'cities'],
    queryFn: () => adminFetch('/admin/cities?page=1&limit=100', citiesSchema),
  });

  const [slug, setSlug] = useState(site?.slug ?? '');
  const [category, setCategory] = useState<SiteCategory>(site?.category ?? 'ANCIENT');
  const [lat, setLat] = useState(site?.lat ?? '');
  const [lng, setLng] = useState(site?.lng ?? '');
  const [cityId, setCityId] = useState(site?.city.id ?? '');

  const [activeTab, setActiveTab] = useState<ContentLocaleCode>('fa');
  const [titleFa, setTitleFa] = useState(() => initialTitle(site, 'fa'));
  const [titleEn, setTitleEn] = useState(() => initialTitle(site, 'en'));
  const [titleAr, setTitleAr] = useState(() => initialTitle(site, 'ar'));
  const [shortFa, setShortFa] = useState(() => initialShort(site, 'fa'));
  const [shortEn, setShortEn] = useState(() => initialShort(site, 'en'));
  const [shortAr, setShortAr] = useState(() => initialShort(site, 'ar'));
  const [blocksFa, setBlocksFa] = useState<EditorBlock[]>(() => initialBlocks(site, 'fa'));
  const [blocksEn, setBlocksEn] = useState<EditorBlock[]>(() => initialBlocks(site, 'en'));
  const [blocksAr, setBlocksAr] = useState<EditorBlock[]>(() => initialBlocks(site, 'ar'));

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filesByKey = useRef<Map<string, File>>(new Map());

  const historiesRef = useRef<Record<ContentLocaleCode, TabHistory<TabSnapshot>> | null>(null);
  if (!historiesRef.current) {
    historiesRef.current = {
      fa: createTabHistory<TabSnapshot>(),
      en: createTabHistory<TabSnapshot>(),
      ar: createTabHistory<TabSnapshot>(),
    };
  }
  const histories = historiesRef.current;
  const historyInitialized = useRef(false);

  useEffect(() => {
    if (historyInitialized.current) return;
    historyInitialized.current = true;
    histories.fa.push({ title: titleFa, shortDescription: shortFa, blocks: blocksFa });
    histories.en.push({ title: titleEn, shortDescription: shortEn, blocks: blocksEn });
    histories.ar.push({ title: titleAr, shortDescription: shortAr, blocks: blocksAr });
  }, [
    histories,
    titleFa,
    shortFa,
    blocksFa,
    titleEn,
    shortEn,
    blocksEn,
    titleAr,
    shortAr,
    blocksAr,
  ]);

  function getSnapshot(locale: ContentLocaleCode): TabSnapshot {
    switch (locale) {
      case 'fa':
        return { title: titleFa, shortDescription: shortFa, blocks: blocksFa };
      case 'en':
        return { title: titleEn, shortDescription: shortEn, blocks: blocksEn };
      case 'ar':
        return { title: titleAr, shortDescription: shortAr, blocks: blocksAr };
    }
  }

  function applySnapshot(locale: ContentLocaleCode, snapshot: TabSnapshot) {
    switch (locale) {
      case 'fa':
        setTitleFa(snapshot.title);
        setShortFa(snapshot.shortDescription);
        setBlocksFa(snapshot.blocks);
        break;
      case 'en':
        setTitleEn(snapshot.title);
        setShortEn(snapshot.shortDescription);
        setBlocksEn(snapshot.blocks);
        break;
      case 'ar':
        setTitleAr(snapshot.title);
        setShortAr(snapshot.shortDescription);
        setBlocksAr(snapshot.blocks);
        break;
    }
  }

  function updateTitle(locale: ContentLocaleCode, title: string) {
    const next = { ...getSnapshot(locale), title };
    applySnapshot(locale, next);
    histories[locale].pushCoalesced(next, 'title');
  }

  function updateShort(locale: ContentLocaleCode, shortDescription: string) {
    const next = { ...getSnapshot(locale), shortDescription };
    applySnapshot(locale, next);
    histories[locale].pushCoalesced(next, 'short');
  }

  function updateBlocks(locale: ContentLocaleCode, blocks: EditorBlock[]) {
    const next = { ...getSnapshot(locale), blocks };
    applySnapshot(locale, next);
    // Coalesce rapid canvas typing; structural edits still become separate steps after ~300ms idle.
    histories[locale].pushCoalesced(next, 'blocks');
  }

  function handleUndo() {
    const snapshot = histories[activeTab].undo();
    if (snapshot) applySnapshot(activeTab, snapshot);
  }

  function handleRedo() {
    const snapshot = histories[activeTab].redo();
    if (snapshot) applySnapshot(activeTab, snapshot);
  }

  function handleFormKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    const target = event.target as Node | null;
    if (!target || !formRef.current?.contains(target)) return;

    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;

    if (event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      handleUndo();
    } else if ((event.key === 'z' && event.shiftKey) || event.key === 'y') {
      event.preventDefault();
      handleRedo();
    }
  }

  const blockLabels: BlockListEditorLabels = {
    addHeading: tb('addHeading'),
    addParagraph: tb('addParagraph'),
    addImage: tb('addImage'),
    addAudio: tb('addAudio'),
    addVideo: tb('addVideo'),
    addBlock: tb('addBlock'),
    moveUp: tb('moveUp'),
    moveDown: tb('moveDown'),
    dragReorder: tb('dragReorder'),
    delete: tb('delete'),
    empty: tb('empty'),
    inspectorEmpty: tb('inspectorEmpty'),
    closeInspector: tb('closeInspector'),
    blockType: tb('blockType'),
    headingTitle: tb('headingTitle'),
    paragraphTitle: tb('paragraphTitle'),
    imageTitle: tb('imageTitle'),
    audioTitle: tb('audioTitle'),
    videoTitle: tb('videoTitle'),
    text: tb('text'),
    caption: tb('caption'),
    embedUrl: tb('embedUrl'),
    textRole: tb('textRole'),
    colorToken: tb('colorToken'),
    align: tb('align'),
    roleHero: tb('roleHero'),
    roleH2: tb('roleH2'),
    roleH3: tb('roleH3'),
    roleBody: tb('roleBody'),
    roleCaption: tb('roleCaption'),
    colorBrown950: tb('colorBrown950'),
    colorBrown800: tb('colorBrown800'),
    colorBrown600: tb('colorBrown600'),
    colorTeal700: tb('colorTeal700'),
    colorSand50: tb('colorSand50'),
    alignStart: tb('alignStart'),
    alignCenter: tb('alignCenter'),
    alignEnd: tb('alignEnd'),
    bold: tb('bold'),
    italic: tb('italic'),
    link: tb('link'),
    unlink: tb('unlink'),
    linkPrompt: tb('linkPrompt'),
    formatToolbar: tb('formatToolbar'),
    pickImage: t('pickImage'),
    changeImage: t('changeImage'),
    removeImage: t('removeImage'),
    pickAudio: tb('pickAudio'),
    changeAudio: tb('changeAudio'),
    removeAudio: tb('removeAudio'),
    audioAttached: tb('audioAttached'),
  };

  const titleLabels: Record<ContentLocaleCode, string> = {
    fa: t('titleFa'),
    en: t('titleEn'),
    ar: t('titleAr'),
  };

  const shortLabels: Record<ContentLocaleCode, string> = {
    fa: t('shortFa'),
    en: t('shortEn'),
    ar: t('shortAr'),
  };

  const categoryOptions = [
    { value: 'ANCIENT', label: t('ancient') },
    { value: 'ISLAMIC', label: t('islamic') },
    { value: 'NATURAL', label: t('natural') },
  ];

  const cityOptions = (cities?.items ?? []).map((city) => {
    const preferEn = uiLocale === 'en';
    const cityName = preferEn ? city.nameEn : city.nameFa;
    const provinceName = preferEn ? city.province.nameEn : city.province.nameFa;
    return { value: city.id, label: `${cityName} · ${provinceName}` };
  });

  function handlePickFile(
    locale: ContentLocaleCode,
    block: EditorImageBlock | EditorAudioBlock,
    file: File,
  ) {
    filesByKey.current.set(block.key, file);
    const previewUrl = block.type === 'IMAGE' ? URL.createObjectURL(file) : undefined;
    const blocks = getSnapshot(locale).blocks;
    updateBlocks(
      locale,
      blocks.map((candidate) =>
        candidate.key === block.key
          ? ({
              ...candidate,
              mediaId: undefined,
              clientFileKey: block.key,
              ...(previewUrl ? { previewUrl } : {}),
            } as EditorBlock)
          : candidate,
      ),
    );
  }

  function handleCopyFromFa(target: 'en' | 'ar') {
    const targetBlocks = target === 'en' ? blocksEn : blocksAr;
    const confirmKey = target === 'en' ? 'copyConfirm' : 'copyConfirmAr';
    if (targetBlocks.length > 0 && !window.confirm(t(confirmKey))) {
      return;
    }
    updateBlocks(target, copyBlocksFromFa(blocksFa));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();

      const existingByHash = new Map<string, string>();
      for (const media of site?.media ?? []) {
        if (media.contentHash) existingByHash.set(media.contentHash, media.id);
      }
      const resolvedByHash = new Map<string, MediaRef>();

      async function resolveFile(preferredKey: string, file: File): Promise<MediaRef> {
        const processed = file.type.startsWith('image/') ? await optimizeImage(file) : file;
        const contentHash = await sha256HexOfFile(processed);

        const existingId = existingByHash.get(contentHash);
        if (existingId) return { mediaId: existingId };

        const cached = resolvedByHash.get(contentHash);
        if (cached) return cached;

        formData.append(preferredKey, processed, processed.name || preferredKey);
        const ref: MediaRef = { clientFileKey: preferredKey, contentHash };
        resolvedByHash.set(contentHash, ref);
        return ref;
      }

      let cover: CreateSiteFullInput['cover'];
      if (coverFile) {
        cover = await resolveFile('cover', coverFile);
      } else if (isEdit && site) {
        const existingCover = site.media.find((media) => media.isCover);
        if (existingCover) cover = { mediaId: existingCover.id };
      }

      async function buildBlocks(blocks: EditorBlock[]): Promise<AdminBlockWrite[]> {
        const out: AdminBlockWrite[] = [];
        for (const block of blocks) {
          switch (block.type) {
            case 'HEADING':
            case 'PARAGRAPH': {
              const plain = spansToPlainText(block.spans).trim();
              if (!plain) continue;
              out.push({
                type: block.type,
                textRole: block.textRole,
                colorToken: block.colorToken,
                align: block.align,
                spans: block.spans,
              });
              break;
            }
            case 'VIDEO':
              out.push({
                type: 'VIDEO',
                embedUrl: block.embedUrl,
                caption: block.caption.trim() ? block.caption : null,
                ...(block.mediaId ? { mediaId: block.mediaId } : {}),
              });
              break;
            case 'IMAGE':
            case 'AUDIO': {
              const staged = block.clientFileKey
                ? filesByKey.current.get(block.key)
                : undefined;
              let ref: MediaRef | undefined;
              if (staged) {
                ref = await resolveFile(block.key, staged);
              } else if (block.mediaId) {
                ref = { mediaId: block.mediaId };
              }
              if (ref) {
                out.push({
                  type: block.type,
                  caption: block.caption.trim() ? block.caption : null,
                  ...ref,
                });
              }
              break;
            }
          }
        }
        return out;
      }

      const faBlocks = await buildBlocks(blocksFa);
      const enBlocks = await buildBlocks(blocksEn);
      const arBlocks = await buildBlocks(blocksAr);

      const translations = [
        { locale: 'fa' as const, title: titleFa, shortDescription: shortFa, blocks: faBlocks },
        { locale: 'en' as const, title: titleEn, shortDescription: shortEn, blocks: enBlocks },
        { locale: 'ar' as const, title: titleAr, shortDescription: shortAr, blocks: arBlocks },
      ];

      if (isEdit && site) {
        const payload = updateSiteFullSchema.parse({
          slug,
          category,
          lat,
          lng,
          cityId,
          isActive: site.isActive,
          cover,
          translations,
        });
        formData.append('payload', JSON.stringify(payload));
        return adminFetch(`/admin/sites/${site.id}`, adminSiteSchema, {
          method: 'PUT',
          body: formData,
        });
      }

      const payload = createSiteFullSchema.parse({
        slug,
        category,
        lat,
        lng,
        cityId,
        isActive: true,
        cover,
        translations,
      });
      formData.append('payload', JSON.stringify(payload));
      return adminFetch('/admin/sites', adminSiteSchema, {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'sites'] });
      router.replace(`/admin/sites/${saved.id}`);
      router.refresh();
    },
    onError: () => setError(t('saveFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!site) throw new Error('missing site');
      await adminFetchVoid(`/admin/sites/${site.id}`, { method: 'DELETE' });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'sites'] });
      router.replace('/admin/sites');
      router.refresh();
    },
    onError: () => setError(t('deleteFailed')),
  });

  const activeContent = CONTENT_LOCALE_DEFINITIONS[activeTab];
  const activeSnapshot = getSnapshot(activeTab);

  return (
    <form
      ref={formRef}
      className="w-full space-y-6"
      onKeyDown={handleFormKeyDown}
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        saveMutation.mutate();
      }}
    >
      <Field label={t('slug')} hint={t('slugHint')}>
        <TextInput value={slug} onChange={(event) => setSlug(event.target.value)} dir="ltr" />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t('category')}>
          <Select
            value={category}
            onChange={(value) => setCategory(value as SiteCategory)}
            options={categoryOptions}
          />
        </Field>
        <Field label={t('city')}>
          <Select value={cityId} onChange={setCityId} options={cityOptions} placeholder="—" />
        </Field>
      </div>

      <LocationMapPicker
        lat={lat}
        lng={lng}
        onLatLngChange={(nextLat, nextLng) => {
          setLat(nextLat);
          setLng(nextLng);
        }}
        apiKey={env.NEXT_PUBLIC_MAP_IR_API_KEY}
        labels={{
          map: t('map'),
          hint: t('mapHint'),
          missingKey: t('mapMissingKey'),
        }}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t('lat')}>
          <TextInput value={lat} onChange={(event) => setLat(event.target.value)} dir="ltr" />
        </Field>
        <Field label={t('lng')}>
          <TextInput value={lng} onChange={(event) => setLng(event.target.value)} dir="ltr" />
        </Field>
      </div>

      <ImagePicker
        label={t('cover')}
        value={coverFile}
        onChange={setCoverFile}
        currentUrl={site?.coverUrl}
        pickLabel={t('pickImage')}
        changeLabel={t('changeImage')}
        removeLabel={t('removeImage')}
      />

      {isEdit && slug.trim() ? (
        <AdminSiteQrPanel
          slug={slug.trim()}
          labels={{
            title: t('qrTitle'),
            scan: t('qrScan'),
            download: t('qrDownload'),
            targetUrl: t('qrTargetUrl'),
          }}
        />
      ) : null}

      <div className="space-y-4">
        <Tabs
          value={activeTab}
          onChange={(value) => setActiveTab(value as ContentLocaleCode)}
          items={CONTENT_LOCALES.map((code) => ({
            value: code,
            label: CONTENT_LOCALE_DEFINITIONS[code].nativeName,
          }))}
        />

        <div className="space-y-4">
          <Field label={titleLabels[activeTab]}>
            <TextInput
              value={activeSnapshot.title}
              onChange={(event) => updateTitle(activeTab, event.target.value)}
              dir={activeContent.dir}
            />
          </Field>
          <Field label={shortLabels[activeTab]}>
            <TextArea
              value={activeSnapshot.shortDescription}
              onChange={(event) => updateShort(activeTab, event.target.value)}
              rows={3}
              dir={activeContent.dir}
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold tracking-wide text-brown-800">
              {t('contentBlocks')}
            </span>
            {activeTab !== 'fa' ? (
              <ActionButton
                type="button"
                variant="secondary"
                onClick={() => handleCopyFromFa(activeTab)}
              >
                {t('copyFromFa')}
              </ActionButton>
            ) : null}
          </div>
          <BlockListEditor
            value={activeSnapshot.blocks}
            onChange={(blocks) => updateBlocks(activeTab, blocks)}
            labels={blockLabels}
            contentDir={activeContent.dir}
            onPickFile={(block, file) => handlePickFile(activeTab, block, file)}
          />
        </div>
      </div>

      {error ? <p className="text-[15px] text-[#B44B3D]">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <ActionButton type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? t('saving') : isEdit ? t('save') : t('create')}
        </ActionButton>
        {isEdit && site ? (
          <ActionButton
            type="button"
            variant="ghost"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (!window.confirm(t('deleteConfirm'))) return;
              deleteMutation.mutate();
            }}
          >
            {t('delete')}
          </ActionButton>
        ) : null}
      </div>
    </form>
  );
}
