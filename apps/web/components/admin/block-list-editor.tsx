'use client';

import { useEffect, useState } from 'react';
import { BlockCanvas } from '@/components/admin/block-canvas';
import { BlockInspector } from '@/components/admin/block-inspector';
import { convertBlockType, insertBlockAt, moveBlock, reorderBlock } from '@/lib/block-editor-utils';
import type { LocaleDirection } from '@/i18n/locales';
import type {
  EditorAudioBlock,
  EditorBlock,
  EditorImageBlock,
} from '@/lib/copy-blocks-from-fa';

export type BlockListEditorLabels = {
  addHeading: string;
  addParagraph: string;
  addList: string;
  addImage: string;
  addAudio: string;
  addVideo: string;
  /** Accessible name for the canvas **+** insert triggers (`BlockInsertMenu`). */
  addBlock: string;
  moveUp: string;
  moveDown: string;
  /** Canvas drag grip (`BlockCanvas` selected block). */
  dragReorder: string;
  delete: string;
  empty: string;
  /** `BlockInspector` empty-state copy: "Select a block or insert one." */
  inspectorEmpty: string;
  /** `BlockInspector` mobile bottom-sheet close control. */
  closeInspector: string;
  /** `BlockInspector` block-type `Select` field label. */
  blockType: string;
  headingTitle: string;
  paragraphTitle: string;
  imageTitle: string;
  audioTitle: string;
  videoTitle: string;
  listTitle: string;
  listStyle: string;
  listBullet: string;
  listNumbered: string;
  addListItem: string;
  removeListItem: string;
  text: string;
  caption: string;
  embedUrl: string;
  textRole: string;
  colorToken: string;
  align: string;
  roleHero: string;
  roleH2: string;
  roleH3: string;
  roleBody: string;
  roleCaption: string;
  colorBrown950: string;
  colorBrown800: string;
  colorBrown600: string;
  colorTeal700: string;
  colorSand50: string;
  alignStart: string;
  alignCenter: string;
  alignEnd: string;
  bold: string;
  italic: string;
  link: string;
  linkUrl: string;
  linkApply: string;
  linkRemove: string;
  linkInvalidUrl: string;
  formatToolbar: string;
  pickImage: string;
  changeImage: string;
  removeImage: string;
  pickAudio: string;
  changeAudio: string;
  removeAudio: string;
  audioAttached: string;
};

type BlockListEditorProps = {
  value: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  labels: BlockListEditorLabels;
  /**
   * Permanent writing direction for the document canvas (FA/AR → `rtl`, EN → `ltr`).
   * Independent of the admin UI locale / next-intl page `dir`.
   */
  contentDir: LocaleDirection;
  /**
   * Called when the user picks a raw file for an IMAGE/AUDIO block. This component stays
   * decoupled from hashing/optimizing (see `lib/file-hash.ts`, `lib/optimize-image.ts`) — the
   * caller is expected to process the file and then call `onChange` with the block's
   * `mediaId`/`clientFileKey`/`previewUrl` updated.
   */
  onPickFile?: (block: EditorImageBlock | EditorAudioBlock, file: File) => void;
};

function isTextType(type: EditorBlock['type']): boolean {
  return type === 'HEADING' || type === 'PARAGRAPH';
}

/**
 * Document-canvas block editor shell. Owns `selectedKey`/`textFocusKey` and composes the
 * `BlockCanvas` (styled, in-place editing surface) with the `BlockInspector` (type/style/media/
 * reorder/delete panel). All structural edits go through `lib/block-editor-utils.ts`
 * (`insertBlockAt`/`moveBlock`/`convertBlockType`) so the flat `EditorBlock[]` stays the single
 * source of truth; the payload/save contract in `SiteForm` is unchanged. Replaces the former
 * card-stack UI (per-block forms with inline Selects and action rows).
 */
export function BlockListEditor({
  value,
  onChange,
  labels,
  contentDir,
  onPickFile,
}: BlockListEditorProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [textFocusKey, setTextFocusKey] = useState<string | null>(null);

  // Stale selection (deleted block / "Copy from FA" replace) simply resolves to null below.
  const selectedBlock = value.find((block) => block.key === selectedKey) ?? null;
  const selectedIndex = selectedBlock
    ? value.findIndex((block) => block.key === selectedBlock.key)
    : -1;

  function updateBlock(key: string, patch: Partial<EditorBlock>) {
    onChange(
      value.map((block) => (block.key === key ? ({ ...block, ...patch } as EditorBlock) : block)),
    );
  }

  function handleInsertAt(index: number, type: EditorBlock['type']) {
    const { blocks, key } = insertBlockAt(value, index, type);
    onChange(blocks);
    setSelectedKey(key);
    setTextFocusKey(isTextType(type) ? key : null);
  }

  function handleConvertType(type: EditorBlock['type']) {
    if (!selectedBlock) return;
    onChange(
      value.map((block) =>
        block.key === selectedBlock.key ? convertBlockType(block, type) : block,
      ),
    );
  }

  function handleMove(direction: 'up' | 'down') {
    if (!selectedBlock) return;
    onChange(moveBlock(value, selectedBlock.key, direction));
  }

  function handleReorder(fromIndex: number, toIndex: number) {
    onChange(reorderBlock(value, fromIndex, toIndex));
  }

  function handleDelete() {
    if (!selectedBlock) return;
    onChange(value.filter((block) => block.key !== selectedBlock.key));
    setSelectedKey(null);
  }

  // Escape deselects; Delete/Backspace removes the selected block, but only when focus is not in a
  // text/URL/caption control so typing (incl. deleting characters) never destroys a whole block.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedKey(null);
        return;
      }

      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      if (!selectedKey) return;

      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable
        ) {
          return;
        }
      }

      event.preventDefault();
      onChange(value.filter((block) => block.key !== selectedKey));
      setSelectedKey(null);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedKey, value, onChange]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1">
        <BlockCanvas
          value={value}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          onChangeBlock={updateBlock}
          onInsertAt={handleInsertAt}
          onReorder={handleReorder}
          onPickFile={onPickFile}
          labels={labels}
          textFocusKey={textFocusKey}
          dir={contentDir}
        />
      </div>

      <BlockInspector
        block={selectedBlock}
        canMoveUp={selectedIndex > 0}
        canMoveDown={selectedIndex >= 0 && selectedIndex < value.length - 1}
        labels={labels}
        onChange={(patch) => {
          if (selectedBlock) updateBlock(selectedBlock.key, patch);
        }}
        onConvertType={handleConvertType}
        onMove={handleMove}
        onDelete={handleDelete}
        onPickFile={onPickFile}
        onClose={() => setSelectedKey(null)}
      />
    </div>
  );
}
