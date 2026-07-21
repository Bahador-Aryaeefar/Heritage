'use client';

import { ActionButton } from '@/components/ui/action-button';
import { Field, TextInput } from '@/components/ui/text-field';
import { Select, type SelectOption } from '@/components/ui/select';
import { MediaFilePicker } from '@/components/admin/media-file-picker';
import type { BlockListEditorLabels } from '@/components/admin/block-list-editor';
import type {
  EditorAlign,
  EditorAudioBlock,
  EditorBlock,
  EditorColorToken,
  EditorImageBlock,
  EditorTextRole,
} from '@/lib/copy-blocks-from-fa';

export type BlockInspectorLabels = BlockListEditorLabels;

type BlockInspectorProps = {
  block: EditorBlock | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  labels: BlockInspectorLabels;
  onChange: (patch: Partial<EditorBlock>) => void;
  onConvertType: (type: EditorBlock['type']) => void;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
  onPickFile?: (block: EditorImageBlock | EditorAudioBlock, file: File) => void;
  /** Mobile bottom-sheet close control (`labels.closeInspector`). No-op on the desktop panel. */
  onClose?: () => void;
};

function typeTitle(block: EditorBlock, labels: BlockInspectorLabels): string {
  switch (block.type) {
    case 'HEADING':
      return labels.headingTitle;
    case 'PARAGRAPH':
      return labels.paragraphTitle;
    case 'IMAGE':
      return labels.imageTitle;
    case 'AUDIO':
      return labels.audioTitle;
    case 'VIDEO':
      return labels.videoTitle;
  }
}

function typeOptions(labels: BlockInspectorLabels): SelectOption[] {
  return [
    { value: 'HEADING', label: labels.headingTitle },
    { value: 'PARAGRAPH', label: labels.paragraphTitle },
    { value: 'IMAGE', label: labels.imageTitle },
    { value: 'AUDIO', label: labels.audioTitle },
    { value: 'VIDEO', label: labels.videoTitle },
  ];
}

function textRoleOptions(labels: BlockInspectorLabels): SelectOption[] {
  return [
    { value: 'HERO', label: labels.roleHero },
    { value: 'H2', label: labels.roleH2 },
    { value: 'H3', label: labels.roleH3 },
    { value: 'BODY', label: labels.roleBody },
    { value: 'CAPTION', label: labels.roleCaption },
  ];
}

function colorTokenOptions(labels: BlockInspectorLabels): SelectOption[] {
  return [
    { value: 'BROWN_950', label: labels.colorBrown950 },
    { value: 'BROWN_800', label: labels.colorBrown800 },
    { value: 'BROWN_600', label: labels.colorBrown600 },
    { value: 'TEAL_700', label: labels.colorTeal700 },
    { value: 'SAND_50', label: labels.colorSand50 },
  ];
}

function alignOptions(labels: BlockInspectorLabels): SelectOption[] {
  return [
    { value: 'START', label: labels.alignStart },
    { value: 'CENTER', label: labels.alignCenter },
    { value: 'END', label: labels.alignEnd },
  ];
}

/**
 * Side panel (desktop) / bottom sheet (mobile) for the selected document-canvas block.
 * Fully controlled — the caller (`BlockListEditor` shell, Task 5) owns `selectedKey` and
 * translates `onChange`/`onConvertType`/`onMove`/`onDelete` into the flat `EditorBlock[]`
 * update, reusing `convertBlockType`/`moveBlock` from `lib/block-editor-utils.ts`.
 */
export function BlockInspector({
  block,
  canMoveUp,
  canMoveDown,
  labels,
  onChange,
  onConvertType,
  onMove,
  onDelete,
  onPickFile,
  onClose,
}: BlockInspectorProps) {
  function renderFields(current: EditorBlock) {
    return (
      <>
        <Field label={labels.blockType}>
          <Select
            value={current.type}
            onChange={(value) => onConvertType(value as EditorBlock['type'])}
            options={typeOptions(labels)}
          />
        </Field>

        {current.type === 'HEADING' || current.type === 'PARAGRAPH' ? (
          <>
            <Field label={labels.textRole}>
              <Select
                value={current.textRole}
                onChange={(value) => onChange({ textRole: value as EditorTextRole })}
                options={textRoleOptions(labels)}
              />
            </Field>
            <Field label={labels.colorToken}>
              <Select
                value={current.colorToken}
                onChange={(value) => onChange({ colorToken: value as EditorColorToken })}
                options={colorTokenOptions(labels)}
              />
            </Field>
            <Field label={labels.align}>
              <Select
                value={current.align}
                onChange={(value) => onChange({ align: value as EditorAlign })}
                options={alignOptions(labels)}
              />
            </Field>
          </>
        ) : null}

        {current.type === 'IMAGE' ? (
          <>
            <Field label={labels.caption}>
              <TextInput
                value={current.caption}
                onChange={(event) => onChange({ caption: event.target.value })}
              />
            </Field>
            <MediaFilePicker
              kind="image"
              previewUrl={current.previewUrl ?? null}
              hasFile={Boolean(current.mediaId || current.clientFileKey)}
              labels={{
                pick: labels.pickImage,
                change: labels.changeImage,
                remove: labels.removeImage,
                attached: labels.pickImage,
              }}
              onPick={(file) => onPickFile?.(current, file)}
              onRemove={() =>
                onChange({ mediaId: undefined, clientFileKey: undefined, previewUrl: undefined })
              }
            />
          </>
        ) : null}

        {current.type === 'AUDIO' ? (
          <>
            <Field label={labels.caption}>
              <TextInput
                value={current.caption}
                onChange={(event) => onChange({ caption: event.target.value })}
              />
            </Field>
            <MediaFilePicker
              kind="audio"
              previewUrl={null}
              hasFile={Boolean(current.mediaId || current.clientFileKey)}
              labels={{
                pick: labels.pickAudio,
                change: labels.changeAudio,
                remove: labels.removeAudio,
                attached: labels.audioAttached,
              }}
              onPick={(file) => onPickFile?.(current, file)}
              onRemove={() => onChange({ mediaId: undefined, clientFileKey: undefined })}
            />
          </>
        ) : null}

        {current.type === 'VIDEO' ? (
          <>
            <Field label={labels.caption}>
              <TextInput
                value={current.caption}
                onChange={(event) => onChange({ caption: event.target.value })}
              />
            </Field>
            <Field label={labels.embedUrl}>
              <TextInput
                value={current.embedUrl}
                onChange={(event) => onChange({ embedUrl: event.target.value })}
                dir="ltr"
              />
            </Field>
          </>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-brown-800/10 pt-3">
          <ActionButton
            type="button"
            variant="ghost"
            disabled={!canMoveUp}
            onClick={() => onMove('up')}
          >
            {labels.moveUp}
          </ActionButton>
          <ActionButton
            type="button"
            variant="ghost"
            disabled={!canMoveDown}
            onClick={() => onMove('down')}
          >
            {labels.moveDown}
          </ActionButton>
          <ActionButton type="button" variant="ghost" onClick={onDelete}>
            {labels.delete}
          </ActionButton>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Desktop / tablet (>=700px, --breakpoint-md): always-visible sticky panel. */}
      <aside className="hidden md:sticky md:top-4 md:block md:w-[280px] md:shrink-0 md:self-start md:space-y-3 md:rounded-card md:border md:border-brown-800/15 md:bg-white md:p-4">
        {block ? (
          renderFields(block)
        ) : (
          <p className="text-[15px] text-brown-600">{labels.inspectorEmpty}</p>
        )}
      </aside>

      {/* Mobile (<700px): bottom sheet, only rendered while a block is selected. */}
      {block ? (
        <div className="fixed inset-x-0 bottom-0 z-[1100] max-h-[75vh] space-y-3 overflow-y-auto rounded-t-card border-t-2 border-brown-800/15 bg-white p-4 shadow-[0_-12px_32px_rgba(42,29,20,0.16)] md:hidden">
          <div className="flex items-center justify-between gap-3 border-b border-brown-800/10 pb-3">
            <span className="text-[15px] font-bold text-brown-950">{typeTitle(block, labels)}</span>
            <ActionButton type="button" variant="ghost" onClick={onClose}>
              {labels.closeInspector}
            </ActionButton>
          </div>
          {renderFields(block)}
        </div>
      ) : null}
    </>
  );
}
