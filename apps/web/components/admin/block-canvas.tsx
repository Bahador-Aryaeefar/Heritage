'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import type { TextSpan } from '@heritage/shared-types';
import { BlockInsertMenu } from '@/components/admin/block-insert-menu';
import { FormatToolbar } from '@/components/admin/format-toolbar';
import { LinkPopover } from '@/components/admin/link-popover';
import { MediaFilePicker } from '@/components/admin/media-file-picker';
import {
  SpanTextEditor,
  type SpanFormatState,
  type SpanTextEditorHandle,
} from '@/components/admin/span-text-editor';
import { alignClasses, colorClasses, roleClasses } from '@/components/public/content-blocks/text-block';
import type { BlockListEditorLabels } from '@/components/admin/block-list-editor';
import type { LocaleDirection } from '@/i18n/locales';
import type {
  EditorAudioBlock,
  EditorBlock,
  EditorImageBlock,
  EditorListBlock,
  EditorTextBlock,
  EditorVideoBlock,
} from '@/lib/copy-blocks-from-fa';
import { spansToPlainText, type TextSelection } from '@/lib/text-spans';

const EMPTY_FORMAT: SpanFormatState = {
  boldActive: false,
  italicActive: false,
  linkActive: false,
  linkHref: null,
  selection: null,
};

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
  /** Permanent content writing direction (FA/AR `rtl` / EN `ltr`) — not the UI locale dir. */
  dir: LocaleDirection;
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
  dragReorderLabel,
  onDragStart,
  onDragEnd,
}: {
  blockKey: string;
  dragReorderLabel: string;
  onDragStart: (event: React.DragEvent<HTMLButtonElement>, key: string) => void;
  onDragEnd: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      aria-label={dragReorderLabel}
      title={dragReorderLabel}
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
  dir,
}: BlockCanvasProps) {
  const editorRef = useRef<SpanTextEditorHandle>(null);
  const listItemRefs = useRef(new Map<number, SpanTextEditorHandle>());
  const pendingFocusListItem = useRef<number | null>(null);
  const [activeListItemIndex, setActiveListItemIndex] = useState(0);
  const [listSelectionKey, setListSelectionKey] = useState(selectedKey);
  const [focusNonce, setFocusNonce] = useState(0);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [formatState, setFormatState] = useState<SpanFormatState>(EMPTY_FORMAT);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDraftRange, setLinkDraftRange] = useState<TextSelection | null>(null);

  if (listSelectionKey !== selectedKey) {
    setListSelectionKey(selectedKey);
    setActiveListItemIndex(0);
    setLinkOpen(false);
    setLinkDraftRange(null);
    setFormatState(EMPTY_FORMAT);
  }

  function openLinkPopover(getTarget: () => TextSelection | null) {
    setLinkDraftRange(getTarget());
    setLinkOpen(true);
  }

  function closeLinkPopover() {
    setLinkOpen(false);
    setLinkDraftRange(null);
  }

  function requestFocusListItem(index: number) {
    pendingFocusListItem.current = index;
    setFocusNonce((nonce) => nonce + 1);
  }

  useEffect(() => {
    if (!textFocusKey) return;
    editorRef.current?.focus();
  }, [textFocusKey]);

  useEffect(() => {
    const index = pendingFocusListItem.current;
    if (index === null) return;
    pendingFocusListItem.current = null;
    listItemRefs.current.get(index)?.focusAtStart();
  }, [focusNonce, value]);

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
          <>
            <FormatToolbar
              toolbarLabel={labels.formatToolbar}
              labels={{
                bold: labels.bold,
                italic: labels.italic,
                link: labels.link,
              }}
              boldActive={formatState.boldActive}
              italicActive={formatState.italicActive}
              linkActive={formatState.linkActive}
              onPrepare={() => editorRef.current?.snapshotSelection()}
              onBold={() => editorRef.current?.toggleBold()}
              onItalic={() => editorRef.current?.toggleItalic()}
              onLink={() => {
                editorRef.current?.openLink();
              }}
            />
            <LinkPopover
              open={linkOpen}
              initialUrl={formatState.linkHref ?? ''}
              canRemove={Boolean(formatState.linkHref)}
              labels={{
                url: labels.linkUrl,
                apply: labels.linkApply,
                remove: labels.linkRemove,
                invalidUrl: labels.linkInvalidUrl,
              }}
              onApply={(url) => {
                const ok = editorRef.current?.applyLinkUrl(url) ?? false;
                if (ok) closeLinkPopover();
                return ok;
              }}
              onRemove={() => {
                editorRef.current?.removeLink();
                closeLinkPopover();
              }}
              onClose={closeLinkPopover}
            />
          </>
        ) : null}
        <SpanTextEditor
          ref={selected ? editorRef : undefined}
          value={block.spans}
          onChange={(spans) => onChangeBlock(block.key, { spans })}
          placeholder={block.type === 'HEADING' ? labels.headingTitle : labels.paragraphTitle}
          onRequestLink={() =>
            openLinkPopover(() => editorRef.current?.getLinkTargetRange() ?? null)
          }
          onFormatStateChange={setFormatState}
          linkDraftRange={selected && linkOpen ? linkDraftRange : null}
          dir={dir}
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
        previewUrl={block.previewUrl ?? null}
        hasFile={Boolean(block.mediaId || block.clientFileKey || block.previewUrl)}
        labels={{
          pick: labels.pickAudio,
          change: labels.changeAudio,
          remove: labels.removeAudio,
          attached: labels.audioAttached,
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

  function renderVideoBlock(block: EditorVideoBlock) {
    if (isValidEmbedUrl(block.embedUrl)) {
      return (
        <div
          className="overflow-hidden rounded-card ring-1 ring-brown-800/10"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative aspect-video w-full bg-brown-950">
            <iframe
              src={block.embedUrl}
              title={labels.videoTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
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

  function renderListBlock(block: EditorListBlock) {
    const selected = selectedKey === block.key;
    const ListTag = block.listStyle === 'NUMBERED' ? 'ol' : 'ul';
    const listClass =
      block.listStyle === 'NUMBERED'
        ? 'list-decimal space-y-3 ps-6 text-[17px] leading-relaxed text-brown-800'
        : 'list-disc space-y-3 ps-6 text-[17px] leading-relaxed text-brown-800';
    function updateItems(items: EditorListBlock['items']) {
      onChangeBlock(block.key, { items });
    }

    function handleEnterSplit(itemIndex: number, parts: { before: TextSpan[]; after: TextSpan[] }) {
      const items = [
        ...block.items.slice(0, itemIndex),
        { spans: parts.before },
        { spans: parts.after },
        ...block.items.slice(itemIndex + 1),
      ];
      updateItems(items);
      setActiveListItemIndex(itemIndex + 1);
      requestFocusListItem(itemIndex + 1);
    }

    function handleBackspaceAtStart(itemIndex: number) {
      const current = block.items[itemIndex];
      if (!current) return;

      if (itemIndex === 0) {
        if (spansToPlainText(current.spans).length === 0 && block.items.length > 1) {
          updateItems(block.items.slice(1));
          setActiveListItemIndex(0);
          requestFocusListItem(0);
        }
        return;
      }

      const previous = block.items[itemIndex - 1]!;
      const mergedSpans = [...previous.spans, ...current.spans];
      const items = [
        ...block.items.slice(0, itemIndex - 1),
        { spans: mergedSpans },
        ...block.items.slice(itemIndex + 1),
      ];
      updateItems(items);
      setActiveListItemIndex(itemIndex - 1);
      requestAnimationFrame(() => {
        listItemRefs.current.get(itemIndex - 1)?.focusAtEnd();
      });
    }

    return (
      <div className="flex flex-col gap-2">
        {selected ? (
          <>
            <FormatToolbar
              toolbarLabel={labels.formatToolbar}
              labels={{
                bold: labels.bold,
                italic: labels.italic,
                link: labels.link,
              }}
              boldActive={formatState.boldActive}
              italicActive={formatState.italicActive}
              linkActive={formatState.linkActive}
              onPrepare={() => listItemRefs.current.get(activeListItemIndex)?.snapshotSelection()}
              onBold={() => listItemRefs.current.get(activeListItemIndex)?.toggleBold()}
              onItalic={() => listItemRefs.current.get(activeListItemIndex)?.toggleItalic()}
              onLink={() => {
                listItemRefs.current.get(activeListItemIndex)?.openLink();
              }}
            />
            <LinkPopover
              open={linkOpen}
              initialUrl={formatState.linkHref ?? ''}
              canRemove={Boolean(formatState.linkHref)}
              labels={{
                url: labels.linkUrl,
                apply: labels.linkApply,
                remove: labels.linkRemove,
                invalidUrl: labels.linkInvalidUrl,
              }}
              onApply={(url) => {
                const ok =
                  listItemRefs.current.get(activeListItemIndex)?.applyLinkUrl(url) ?? false;
                if (ok) closeLinkPopover();
                return ok;
              }}
              onRemove={() => {
                listItemRefs.current.get(activeListItemIndex)?.removeLink();
                closeLinkPopover();
              }}
              onClose={closeLinkPopover}
            />
          </>
        ) : null}
        <ListTag className={listClass}>
          {block.items.map((item, itemIndex) => (
            <li key={`${block.key}-item-${itemIndex}`}>
              <SpanTextEditor
                ref={(handle) => {
                  if (handle) listItemRefs.current.set(itemIndex, handle);
                  else listItemRefs.current.delete(itemIndex);
                }}
                value={item.spans}
                onChange={(spans) => {
                  const items = block.items.map((entry, index) =>
                    index === itemIndex ? { spans } : entry,
                  );
                  updateItems(items);
                }}
                onFocus={() => setActiveListItemIndex(itemIndex)}
                onRequestLink={() =>
                  openLinkPopover(
                    () => listItemRefs.current.get(itemIndex)?.getLinkTargetRange() ?? null,
                  )
                }
                onFormatStateChange={setFormatState}
                linkDraftRange={
                  selected && linkOpen && itemIndex === activeListItemIndex ? linkDraftRange : null
                }
                onEnterSplit={
                  selected ? (parts) => handleEnterSplit(itemIndex, parts) : undefined
                }
                onBackspaceAtStart={
                  selected ? () => handleBackspaceAtStart(itemIndex) : undefined
                }
                placeholder={labels.listTitle}
                dir={dir}
              />
            </li>
          ))}
        </ListTag>
      </div>
    );
  }

  function renderBlock(block: EditorBlock) {
    switch (block.type) {
      case 'HEADING':
      case 'PARAGRAPH':
        return renderTextBlock(block);
      case 'LIST':
        return renderListBlock(block);
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
                  dragReorderLabel={labels.dragReorder}
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
