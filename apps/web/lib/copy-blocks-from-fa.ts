/**
 * Editor-side shape for `SiteContentBlock` rows (see `heritage-schema-map.md` §"SiteContentBlock").
 * Mirrors the admin write schemas in `@heritage/shared-types`
 * (`adminTextBlockWriteSchema` / `adminImageBlockWriteSchema` / `adminAudioBlockWriteSchema` /
 * `adminVideoBlockWriteSchema`) plus a client-only `key` for React list identity and, for images,
 * a `previewUrl` to render a thumbnail before upload. Text blocks use a single `text` string here
 * (no inline bold/italic spans) — the editor does not expose span-level formatting yet.
 */

export type EditorTextRole = 'HERO' | 'H2' | 'H3' | 'BODY' | 'CAPTION';
export type EditorColorToken = 'BROWN_950' | 'BROWN_800' | 'BROWN_600' | 'TEAL_700' | 'SAND_50';
export type EditorAlign = 'START' | 'CENTER';

export type EditorTextBlock = {
  key: string;
  type: 'HEADING' | 'PARAGRAPH';
  text: string;
  textRole: EditorTextRole;
  colorToken: EditorColorToken;
  align: EditorAlign;
};

export type EditorImageBlock = {
  key: string;
  type: 'IMAGE';
  caption: string;
  mediaId?: string;
  clientFileKey?: string;
  previewUrl?: string;
};

export type EditorAudioBlock = {
  key: string;
  type: 'AUDIO';
  caption: string;
  mediaId?: string;
  clientFileKey?: string;
};

export type EditorVideoBlock = {
  key: string;
  type: 'VIDEO';
  caption: string;
  embedUrl: string;
  mediaId?: string;
};

export type EditorBlock = EditorTextBlock | EditorImageBlock | EditorAudioBlock | EditorVideoBlock;

/** New client-side identity for a block row. Not sent to the API. */
export function createBlockKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Start an EN (or other locale) block list from the FA blocks: new client keys, same order,
 * same starting text/caption/embedUrl values, `mediaId` kept (the underlying file already lives
 * on the server so both locales can reference it). `clientFileKey`/`previewUrl` are dropped —
 * they point at a file staged for the FA tab's own upload; the target locale must pick its own
 * file (or keep the shared `mediaId` if there is one) rather than silently reusing FA's pending upload.
 */
export function copyBlocksFromFa(fa: EditorBlock[]): EditorBlock[] {
  return fa.map((block): EditorBlock => {
    const key = createBlockKey();

    switch (block.type) {
      case 'HEADING':
      case 'PARAGRAPH':
        return {
          key,
          type: block.type,
          text: block.text,
          textRole: block.textRole,
          colorToken: block.colorToken,
          align: block.align,
        };
      case 'VIDEO':
        return {
          key,
          type: 'VIDEO',
          caption: block.caption,
          embedUrl: block.embedUrl,
          ...(block.mediaId ? { mediaId: block.mediaId } : {}),
        };
      case 'IMAGE':
      case 'AUDIO':
        return {
          key,
          type: block.type,
          caption: block.caption,
          ...(block.mediaId ? { mediaId: block.mediaId } : {}),
        };
    }
  });
}
