'use client';

import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
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
import {
  copyBlocksFromFa,
  createBlockKey,
  type EditorAudioBlock,
  type EditorBlock,
  type EditorImageBlock,
} from '@/lib/copy-blocks-from-fa';
import { adminFetch } from '@/lib/admin-api';
import { sha256HexOfFile } from '@/lib/file-hash';
import { optimizeImage } from '@/lib/optimize-image';
import { env } from '@/env';
import { toContentLocale } from '@/i18n/locales';
import type { Locale } from '@/i18n/routing';

const LocationMapPicker = dynamic(
  () =>
    import('@/components/admin/location-map-picker').then((mod) => mod.LocationMapPicker),
  { ssr: false },
);

const citiesSchema = paginatedResponseSchema(cityOptionSchema);

type ContentLocale = 'fa' | 'en';

type MediaRef = { mediaId?: string; clientFileKey?: string; contentHash?: string };

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

function initialBlocks(site: AdminSite | undefined, locale: ContentLocale): EditorBlock[] {
  const translation = site?.translations.find((t) => t.locale === locale);
  return translation ? toEditorBlocks(translation.blocks) : [];
}

export function SiteForm({ site }: SiteFormProps) {
  const router = useRouter();
  const uiLocale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const t = useTranslations('admin.siteForm');
  const tb = useTranslations('admin.siteForm.block');
  const isEdit = Boolean(site);

  const { data: cities } = useQuery({
    queryKey: ['admin', 'cities'],
    queryFn: () => adminFetch('/admin/cities?page=1&limit=100', citiesSchema),
  });

  const [slug, setSlug] = useState(site?.slug ?? '');
  const [category, setCategory] = useState<SiteCategory>(site?.category ?? 'ANCIENT');
  const [lat, setLat] = useState(site?.lat ?? '');
  const [lng, setLng] = useState(site?.lng ?? '');
  const [cityId, setCityId] = useState(site?.city.id ?? '');

  const [activeTab, setActiveTab] = useState<ContentLocale>('fa');
  const [titleFa, setTitleFa] = useState(
    site?.translations.find((tr) => tr.locale === 'fa')?.title ?? '',
  );
  const [titleEn, setTitleEn] = useState(
    site?.translations.find((tr) => tr.locale === 'en')?.title ?? '',
  );
  const [shortFa, setShortFa] = useState(
    site?.translations.find((tr) => tr.locale === 'fa')?.shortDescription ?? '',
  );
  const [shortEn, setShortEn] = useState(
    site?.translations.find((tr) => tr.locale === 'en')?.shortDescription ?? '',
  );
  const [blocksFa, setBlocksFa] = useState<EditorBlock[]>(() => initialBlocks(site, 'fa'));
  const [blocksEn, setBlocksEn] = useState<EditorBlock[]>(() => initialBlocks(site, 'en'));

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Raw files staged by block key. The block itself only carries `clientFileKey`/`previewUrl`;
  // the actual bytes to hash/optimize/upload live here until save.
  const filesByKey = useRef<Map<string, File>>(new Map());

  const blockLabels: BlockListEditorLabels = {
    addHeading: tb('addHeading'),
    addParagraph: tb('addParagraph'),
    addImage: tb('addImage'),
    addAudio: tb('addAudio'),
    addVideo: tb('addVideo'),
    addBlock: tb('addBlock'),
    moveUp: tb('moveUp'),
    moveDown: tb('moveDown'),
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
    pickImage: t('pickImage'),
    changeImage: t('changeImage'),
    removeImage: t('removeImage'),
    pickAudio: tb('pickAudio'),
    changeAudio: tb('changeAudio'),
    removeAudio: tb('removeAudio'),
    audioAttached: tb('audioAttached'),
  };

  const categoryOptions = [
    { value: 'ANCIENT', label: t('ancient') },
    { value: 'ISLAMIC', label: t('islamic') },
    { value: 'NATURAL', label: t('natural') },
  ];

  const cityOptions = (cities?.items ?? []).map((city) => {
    const preferEn = toContentLocale(uiLocale) === 'en';
    const cityName = preferEn ? city.nameEn : city.nameFa;
    const provinceName = preferEn ? city.province.nameEn : city.province.nameFa;
    return { value: city.id, label: `${cityName} · ${provinceName}` };
  });

  function handlePickFile(
    locale: ContentLocale,
    block: EditorImageBlock | EditorAudioBlock,
    file: File,
  ) {
    filesByKey.current.set(block.key, file);
    const previewUrl = block.type === 'IMAGE' ? URL.createObjectURL(file) : undefined;
    const setBlocks = locale === 'fa' ? setBlocksFa : setBlocksEn;
    setBlocks((prev) =>
      prev.map((candidate) =>
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

  function handleCopyFromFa() {
    if (blocksEn.length > 0 && !window.confirm(t('copyConfirm'))) {
      return;
    }
    setBlocksEn(copyBlocksFromFa(blocksFa));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();

      // hash of already-persisted media → its id, so an unchanged file is referenced by mediaId
      // (no re-upload). Session dedupe collapses identical picks (e.g. cover reused as a block).
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

      // Cover first so an identical file reused inside a block collapses onto the "cover" part.
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
            case 'PARAGRAPH':
              out.push({
                type: block.type,
                textRole: block.textRole,
                colorToken: block.colorToken,
                align: block.align,
                spans: block.spans,
              });
              break;
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
              // media block with neither a file nor an existing mediaId: skip
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

      const translations = [
        { locale: 'fa' as const, title: titleFa, shortDescription: shortFa, blocks: faBlocks },
        { locale: 'en' as const, title: titleEn, shortDescription: shortEn, blocks: enBlocks },
      ];

      if (isEdit && site) {
        const payload = updateSiteFullSchema.parse({
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

  return (
    <form
      className="w-full space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        saveMutation.mutate();
      }}
    >
      {!isEdit ? (
        <Field label={t('slug')}>
          <TextInput value={slug} onChange={(event) => setSlug(event.target.value)} dir="ltr" />
        </Field>
      ) : null}

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

      <div className="space-y-4">
        <Tabs
          value={activeTab}
          onChange={(value) => setActiveTab(value as ContentLocale)}
          items={[
            { value: 'fa', label: t('tabFa') },
            { value: 'en', label: t('tabEn') },
          ]}
        />

        {activeTab === 'fa' ? (
          <div className="space-y-4">
            <Field label={t('titleFa')}>
              <TextInput value={titleFa} onChange={(event) => setTitleFa(event.target.value)} dir="rtl" />
            </Field>
            <Field label={t('shortFa')}>
              <TextArea value={shortFa} onChange={(event) => setShortFa(event.target.value)} rows={3} dir="rtl" />
            </Field>
            <span className="block text-xs font-bold tracking-wide text-brown-800">
              {t('contentBlocks')}
            </span>
            <BlockListEditor
              value={blocksFa}
              onChange={setBlocksFa}
              labels={blockLabels}
              onPickFile={(block, file) => handlePickFile('fa', block, file)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <Field label={t('titleEn')}>
              <TextInput value={titleEn} onChange={(event) => setTitleEn(event.target.value)} dir="ltr" />
            </Field>
            <Field label={t('shortEn')}>
              <TextArea value={shortEn} onChange={(event) => setShortEn(event.target.value)} rows={3} dir="ltr" />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold tracking-wide text-brown-800">
                {t('contentBlocks')}
              </span>
              <ActionButton type="button" variant="secondary" onClick={handleCopyFromFa}>
                {t('copyFromFa')}
              </ActionButton>
            </div>
            <BlockListEditor
              value={blocksEn}
              onChange={setBlocksEn}
              labels={blockLabels}
              onPickFile={(block, file) => handlePickFile('en', block, file)}
            />
          </div>
        )}
      </div>

      {error ? <p className="text-[15px] text-[#B44B3D]">{error}</p> : null}

      <ActionButton type="submit" disabled={saveMutation.isPending}>
        {saveMutation.isPending ? t('saving') : isEdit ? t('save') : t('create')}
      </ActionButton>
    </form>
  );
}
