'use client';

import { Fragment, useEffect, useId, useRef } from 'react';
import { ActionButton } from '@/components/ui/action-button';
import { BlockInsertMenu } from '@/components/admin/block-insert-menu';
import { alignClasses, colorClasses, roleClasses } from '@/components/public/content-blocks/text-block';
import type { BlockListEditorLabels } from '@/components/admin/block-list-editor';
import type { LocaleDirection } from '@/i18n/locales';
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
  /** Permanent content writing direction (FA `rtl` / EN `ltr`) — not the UI locale dir. */
  dir: LocaleDirection;
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

function CanvasCaption({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) autoResize(ref.current);
  });

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      className="mt-2 w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-center text-[14px] leading-relaxed text-brown-800 outline-none placeholder:text-brown-600/40"
    />
  );
}

function CanvasFileActions({
  kind,
  hasFile,
  labels,
  onPick,
  onRemove,
}: {
  kind: 'image' | 'audio';
  hasFile: boolean;
  labels: { pick: string; change: string; remove: string };
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="mt-3 flex flex-wrap items-center justify-center gap-2"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionButton type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
        {hasFile ? labels.change : labels.pick}
      </ActionButton>
      {hasFile ? (
        <ActionButton
          type="button"
          variant="ghost"
          onClick={() => {
            onRemove();
            if (inputRef.current) inputRef.current.value = '';
          }}
        >
          {labels.remove}
        </ActionButton>
      ) : null}
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={kind === 'image' ? 'image/*' : 'audio/*'}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
        }}
      />
    </div>
  );
}

/**
 * Document canvas: a single white `rounded-card` surface that renders `EditorBlock[]` styled the
 * way the public article body renders them (`roleClasses`/`colorClasses`/`alignClasses` from
 * `TextBlock`; image/audio/video figures match public `ImageBlock`/`AudioBlock`/`VideoBlock`),
 * with in-place text/caption editing and "+" insert gaps between blocks. Fully controlled —
 * the caller (`BlockListEditor` shell) owns `selectedKey` and applies `onChangeBlock` /
 * `onInsertAt` to its flat `EditorBlock[]` state. Type/style/reorder/delete live in
 * `BlockInspector`; media pick/change/remove and captions are editable on the canvas.
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
  dir,
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
    const hasFile = Boolean(block.mediaId || block.clientFileKey);
    const pickLabels = {
      pick: labels.pickImage,
      change: labels.changeImage,
      remove: labels.removeImage,
    };

    return (
      <figure className="mx-auto flex max-w-lg flex-col items-center text-center">
        {block.previewUrl ? (
          <div className="inline-block max-w-full overflow-hidden rounded-card bg-sand-100 p-2 ring-1 ring-brown-800/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={block.previewUrl}
              alt=""
              className="mx-auto h-auto max-h-80 w-auto max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex h-28 w-full max-w-sm items-center justify-center rounded-card border border-dashed border-brown-800/25 bg-sand-100">
            <span className="text-[15px] font-medium text-brown-600">{labels.pickImage}</span>
          </div>
        )}
        <CanvasCaption
          value={block.caption}
          placeholder={labels.caption}
          onChange={(caption) => onChangeBlock(block.key, { caption })}
        />
        <CanvasFileActions
          kind="image"
          hasFile={hasFile}
          labels={pickLabels}
          onPick={(file) => onPickFile?.(block, file)}
          onRemove={() => {
            if (block.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(block.previewUrl);
            onChangeBlock(block.key, {
              mediaId: undefined,
              clientFileKey: undefined,
              previewUrl: undefined,
            });
          }}
        />
      </figure>
    );
  }

  function renderAudioBlock(block: EditorAudioBlock) {
    const hasFile = Boolean(block.mediaId || block.clientFileKey || block.previewUrl);
    const pickLabels = {
      pick: labels.pickAudio,
      change: labels.changeAudio,
      remove: labels.removeAudio,
    };

    return (
      <figure className="mx-auto w-full max-w-lg text-center">
        {block.previewUrl ? (
          <div className="overflow-hidden rounded-card bg-sand-100 p-4 ring-1 ring-brown-800/10">
            <audio
              controls
              className="w-full"
              src={block.previewUrl}
              aria-label={block.caption || labels.audioTitle}
              onClick={(event) => event.stopPropagation()}
            >
              <track kind="captions" />
            </audio>
          </div>
        ) : (
          <div className="flex h-24 items-center justify-center rounded-card border border-dashed border-brown-800/25 bg-sand-100">
            <span className="text-[15px] font-medium text-brown-600">
              {hasFile ? labels.audioAttached : labels.pickAudio}
            </span>
          </div>
        )}
        <CanvasCaption
          value={block.caption}
          placeholder={labels.caption}
          onChange={(caption) => onChangeBlock(block.key, { caption })}
        />
        <CanvasFileActions
          kind="audio"
          hasFile={hasFile}
          labels={pickLabels}
          onPick={(file) => onPickFile?.(block, file)}
          onRemove={() => {
            if (block.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(block.previewUrl);
            onChangeBlock(block.key, {
              mediaId: undefined,
              clientFileKey: undefined,
              previewUrl: undefined,
            });
          }}
        />
      </figure>
    );
  }

  function renderVideoBlock(block: EditorVideoBlock) {
    return (
      <figure className="mx-auto w-full max-w-2xl text-center">
        {isValidEmbedUrl(block.embedUrl) ? (
          <div className="overflow-hidden rounded-card ring-1 ring-brown-800/10">
            <div className="relative aspect-video w-full bg-brown-950">
              <iframe
                src={block.embedUrl}
                title={labels.videoTitle}
                className="pointer-events-none absolute inset-0 h-full w-full border-0"
              />
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border border-dashed border-brown-800/25 bg-white">
            <div className="flex h-24 items-center justify-center bg-linear-to-br from-brown-800/10 to-teal-700/15">
              <span className="text-[15px] font-medium text-brown-600">{labels.embedUrl}</span>
            </div>
          </div>
        )}
        <CanvasCaption
          value={block.caption}
          placeholder={labels.caption}
          onChange={(caption) => onChangeBlock(block.key, { caption })}
        />
      </figure>
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
      dir={dir}
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
