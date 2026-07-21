'use client';

import { Fragment, useEffect, useRef } from 'react';
import { BlockInsertMenu } from '@/components/admin/block-insert-menu';
import { MediaFilePicker } from '@/components/admin/media-file-picker';
import { alignClasses, colorClasses, roleClasses } from '@/components/public/content-blocks/text-block';
import type { BlockListEditorLabels } from '@/components/admin/block-list-editor';
import type {
  EditorAudioBlock,
  EditorBlock,
  EditorImageBlock,
  EditorTextBlock,
  EditorVideoBlock,
} from '@/lib/copy-blocks-from-fa';

/** Same label bag as `BlockListEditor`/`BlockInspector` — no canvas-only copy needed. */
export type BlockCanvasLabels = BlockListEditorLabels;

type BlockCanvasProps = {
  value: EditorBlock[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  onChangeBlock: (key: string, patch: Partial<EditorBlock>) => void;
  onInsertAt: (index: number, type: EditorBlock['type']) => void;
  onPickFile?: (block: EditorImageBlock | EditorAudioBlock, file: File) => void;
  labels: BlockCanvasLabels;
  /** When set, focus that block's in-canvas textarea (text blocks only) once after an insert. */
  textFocusKey?: string | null;
};

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

function isValidEmbedUrl(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Document canvas: a single white `rounded-card` surface that renders `EditorBlock[]` styled the
 * way the public article body renders them (`roleClasses`/`colorClasses`/`alignClasses` from
 * `TextBlock`), with in-place text editing and "+" insert gaps between blocks. Fully controlled —
 * the caller (`BlockListEditor` shell, Task 5) owns `selectedKey` and applies `onChangeBlock` /
 * `onInsertAt` to its flat `EditorBlock[]` state. Style/type/caption/media/reorder/delete controls
 * live in `BlockInspector`, not here.
 */
export function BlockCanvas({
  value,
  selectedKey,
  onSelect,
  onChangeBlock,
  onInsertAt,
  onPickFile,
  labels,
  textFocusKey,
}: BlockCanvasProps) {
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  useEffect(() => {
    textareaRefs.current.forEach((el) => autoResize(el));
  });

  useEffect(() => {
    if (!textFocusKey) return;
    textareaRefs.current.get(textFocusKey)?.focus();
  }, [textFocusKey]);

  function renderTextBlock(block: EditorTextBlock) {
    return (
      <textarea
        ref={(el) => {
          if (el) textareaRefs.current.set(block.key, el);
          else textareaRefs.current.delete(block.key);
        }}
        value={block.text}
        onChange={(event) => onChangeBlock(block.key, { text: event.target.value })}
        rows={1}
        placeholder={block.type === 'HEADING' ? labels.headingTitle : labels.paragraphTitle}
        className={`w-full resize-none overflow-hidden border-0 bg-transparent p-0 outline-none placeholder:text-brown-600/40 ${roleClasses[block.textRole]} ${colorClasses[block.colorToken]} ${alignClasses[block.align]}`}
      />
    );
  }

  function renderImageBlock(block: EditorImageBlock) {
    return (
      <MediaFilePicker
        kind="image"
        previewUrl={block.previewUrl ?? null}
        hasFile={Boolean(block.mediaId || block.clientFileKey)}
        labels={{
          pick: labels.pickImage,
          change: labels.changeImage,
          remove: labels.removeImage,
          attached: labels.pickImage,
        }}
        onPick={(file) => onPickFile?.(block, file)}
        onRemove={() =>
          onChangeBlock(block.key, {
            mediaId: undefined,
            clientFileKey: undefined,
            previewUrl: undefined,
          })
        }
      />
    );
  }

  function renderAudioBlock(block: EditorAudioBlock) {
    return (
      <MediaFilePicker
        kind="audio"
        previewUrl={null}
        hasFile={Boolean(block.mediaId || block.clientFileKey)}
        labels={{
          pick: labels.pickAudio,
          change: labels.changeAudio,
          remove: labels.removeAudio,
          attached: labels.audioAttached,
        }}
        onPick={(file) => onPickFile?.(block, file)}
        onRemove={() => onChangeBlock(block.key, { mediaId: undefined, clientFileKey: undefined })}
      />
    );
  }

  function renderVideoBlock(block: EditorVideoBlock) {
    if (isValidEmbedUrl(block.embedUrl)) {
      return (
        <div className="overflow-hidden rounded-card ring-1 ring-brown-800/10">
          <div className="relative aspect-video w-full bg-brown-950">
            <iframe
              src={block.embedUrl}
              title={labels.videoTitle}
              className="pointer-events-none absolute inset-0 h-full w-full border-0"
            />
          </div>
        </div>
      );
    }
    return (
      <div className="overflow-hidden rounded-card border border-dashed border-brown-800/25 bg-white">
        <div className="flex h-24 items-center justify-center bg-linear-to-br from-brown-800/10 to-teal-700/15">
          <span className="text-[15px] font-medium text-brown-600">{labels.embedUrl}</span>
        </div>
      </div>
    );
  }

  function renderBlock(block: EditorBlock) {
    switch (block.type) {
      case 'HEADING':
      case 'PARAGRAPH':
        return renderTextBlock(block);
      case 'IMAGE':
        return renderImageBlock(block);
      case 'AUDIO':
        return renderAudioBlock(block);
      case 'VIDEO':
        return renderVideoBlock(block);
    }
  }

  return (
    <div
      className="rounded-card border border-brown-800/15 bg-white px-6 py-8 md:px-10 md:py-10"
      onClick={() => onSelect(null)}
    >
      {value.length === 0 ? <p className="mb-4 text-[15px] text-brown-600">{labels.empty}</p> : null}

      <div className="flex flex-col">
        {value.map((block, index) => (
          <Fragment key={block.key}>
            <div className="flex justify-center py-2">
              <BlockInsertMenu variant="gap" labels={labels} onInsert={(type) => onInsertAt(index, type)} />
            </div>
            <div
              className={`rounded-button -m-1 p-1 ${selectedKey === block.key ? 'ring-2 ring-teal-700/40' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(block.key);
              }}
            >
              {renderBlock(block)}
            </div>
          </Fragment>
        ))}
        <BlockInsertMenu variant="end" labels={labels} onInsert={(type) => onInsertAt(value.length, type)} />
      </div>
    </div>
  );
}
