'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { BlockInsertMenu } from '@/components/admin/block-insert-menu';
import { FormatToolbar } from '@/components/admin/format-toolbar';
import { MediaFilePicker } from '@/components/admin/media-file-picker';
import { SpanTextEditor, type SpanTextEditorHandle } from '@/components/admin/span-text-editor';
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

/** MIME type for block-key drag payloads — avoids collisions with plain-text drags. */
const BLOCK_DRAG_MIME = 'application/x-heritage-block-key';

type BlockCanvasProps = {
  value: EditorBlock[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  onChangeBlock: (key: string, patch: Partial<EditorBlock>) => void;
  onInsertAt: (index: number, type: EditorBlock['type']) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onPickFile?: (block: EditorImageBlock | EditorAudioBlock, file: File) => void;
  labels: BlockCanvasLabels;
  /** When set, focus that block's in-canvas editor (text blocks only) once after an insert. */
  textFocusKey?: string | null;
};

function isValidEmbedUrl(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function DragHandle({
  blockKey,
  onDragStart,
  onDragEnd,
}: {
  blockKey: string;
  onDragStart: (event: React.DragEvent<HTMLButtonElement>, key: string) => void;
  onDragEnd: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      aria-label="Drag to reorder"
      title="Drag to reorder"
      onClick={(event) => event.stopPropagation()}
      onDragStart={(event) => onDragStart(event, blockKey)}
      onDragEnd={onDragEnd}
      className="mb-1 flex cursor-grab items-center justify-center rounded-button border border-brown-800/15 bg-white px-1.5 py-0.5 text-brown-600 active:cursor-grabbing"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 10 16"
        className="h-4 w-2.5 fill-current"
        focusable="false"
      >
        <circle cx="2" cy="3" r="1.25" />
        <circle cx="8" cy="3" r="1.25" />
        <circle cx="2" cy="8" r="1.25" />
        <circle cx="8" cy="8" r="1.25" />
        <circle cx="2" cy="13" r="1.25" />
        <circle cx="8" cy="13" r="1.25" />
      </svg>
    </button>
  );
}

/**
 * Document canvas: a single white `rounded-card` surface that renders `EditorBlock[]` styled the
 * way the public article body renders them (`roleClasses`/`colorClasses`/`alignClasses` from
 * `TextBlock`), with in-place span editing and "+" insert gaps between blocks. Fully controlled —
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
  onReorder,
  onPickFile,
  labels,
  textFocusKey,
}: BlockCanvasProps) {
  const editorRef = useRef<SpanTextEditorHandle>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!textFocusKey) return;
    editorRef.current?.focus();
  }, [textFocusKey]);

  function handleDragStart(event: React.DragEvent<HTMLButtonElement>, key: string) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(BLOCK_DRAG_MIME, key);
    setDraggingKey(key);
  }

  function handleDragEnd() {
    setDraggingKey(null);
    setDropTargetIndex(null);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetIndex(index);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>, toIndex: number) {
    event.preventDefault();
    event.stopPropagation();

    const key = event.dataTransfer.getData(BLOCK_DRAG_MIME);
    const fromIndex = value.findIndex((block) => block.key === key);
    if (fromIndex !== -1 && fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex);
    }

    setDraggingKey(null);
    setDropTargetIndex(null);
  }

  function renderTextBlock(block: EditorTextBlock) {
    const selected = selectedKey === block.key;

    return (
      <>
        {selected ? (
          <FormatToolbar
            toolbarLabel={labels.formatToolbar}
            labels={{
              bold: labels.bold,
              italic: labels.italic,
              link: labels.link,
              unlink: labels.unlink,
            }}
            onBold={() => editorRef.current?.toggleBold()}
            onItalic={() => editorRef.current?.toggleItalic()}
            onLink={() => editorRef.current?.promptLink()}
            onUnlink={() => editorRef.current?.unlink()}
          />
        ) : null}
        <SpanTextEditor
          ref={selected ? editorRef : undefined}
          value={block.spans}
          onChange={(spans) => onChangeBlock(block.key, { spans })}
          placeholder={block.type === 'HEADING' ? labels.headingTitle : labels.paragraphTitle}
          labels={{ linkPrompt: labels.linkPrompt }}
          className={`${roleClasses[block.textRole]} ${colorClasses[block.colorToken]} ${alignClasses[block.align]}`}
        />
      </>
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
              className={`rounded-button -m-1 p-1 ${
                selectedKey === block.key ? 'ring-2 ring-teal-700/40' : ''
              } ${dropTargetIndex === index && draggingKey !== block.key ? 'ring-2 ring-teal-700/60' : ''} ${
                draggingKey === block.key ? 'opacity-60' : ''
              }`}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(block.key);
              }}
              onDragOver={(event) => handleDragOver(event, index)}
              onDragLeave={() => {
                if (dropTargetIndex === index) setDropTargetIndex(null);
              }}
              onDrop={(event) => handleDrop(event, index)}
            >
              {selectedKey === block.key ? (
                <DragHandle
                  blockKey={block.key}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ) : null}
              {renderBlock(block)}
            </div>
          </Fragment>
        ))}
        <BlockInsertMenu variant="end" labels={labels} onInsert={(type) => onInsertAt(value.length, type)} />
      </div>
    </div>
  );
}
