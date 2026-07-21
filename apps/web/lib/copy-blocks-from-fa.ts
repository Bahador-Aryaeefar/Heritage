/**
 * Editor-side shape for `SiteContentBlock` rows (see `heritage-schema-map.md` §"SiteContentBlock").
 * Mirrors the admin write schemas in `@heritage/shared-types`
 * (`adminTextBlockWriteSchema` / `adminImageBlockWriteSchema` / `adminAudioBlockWriteSchema` /
 * `adminVideoBlockWriteSchema`) plus a client-only `key` for React list identity and, for images,
 * a `previewUrl` to render a thumbnail before upload.
 */

import type { ListStyle, TextSpan } from '@heritage/shared-types';

export type EditorTextRole = 'HERO' | 'H2' | 'H3' | 'BODY' | 'CAPTION';
export type EditorColorToken = 'BROWN_950' | 'BROWN_800' | 'BROWN_600' | 'TEAL_700' | 'SAND_50';
export type EditorAlign = 'START' | 'CENTER' | 'END';

export type EditorTextBlock = {
  key: string;
  type: 'HEADING' | 'PARAGRAPH';
  spans: TextSpan[];
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
  /** Same-origin /uploads URL or blob: URL for playable canvas/inspector preview. */
  previewUrl?: string;
};

export type EditorListBlock = {
  key: string;
  type: 'LIST';
  listStyle: ListStyle;
  items: Array<{ spans: TextSpan[] }>;
};

export type EditorVideoBlock = {
  key: string;
  type: 'VIDEO';
  caption: string;
  embedUrl: string;
  mediaId?: string;
};

export type EditorBlock =
  | EditorTextBlock
  | EditorListBlock
  | EditorImageBlock
  | EditorAudioBlock
  | EditorVideoBlock;

/** New client-side identity for a block row. Not sent to the API. */
export function createBlockKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Start an EN (or other locale) block list from the FA blocks: new client keys, same order,
 * same starting span/caption/embedUrl values, `mediaId` kept (the underlying file already lives
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
          spans: block.spans.map((span) => ({ ...span })),
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
      case 'LIST':
        return {
          key,
          type: 'LIST',
          listStyle: block.listStyle,
          items: block.items.map((item) => ({ spans: item.spans.map((span) => ({ ...span })) })),
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
