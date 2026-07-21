'use client';

import { ActionButton } from '@/components/ui/action-button';
import { Field, TextInput } from '@/components/ui/text-field';
import { MediaFilePicker } from '@/components/admin/media-file-picker';
import type { BlockListEditorLabels } from '@/components/admin/block-list-editor';
import type {
  EditorAlign,
  EditorAudioBlock,
  EditorBlock,
  EditorColorToken,
  EditorImageBlock,
  EditorListBlock,
  EditorTextRole,
} from '@/lib/copy-blocks-from-fa';
import type { ListStyle } from '@heritage/shared-types';

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

const COLOR_SWATCH: Record<EditorColorToken, string> = {
  BROWN_950: 'bg-brown-950',
  BROWN_800: 'bg-brown-800',
  BROWN_600: 'bg-brown-600',
  TEAL_700: 'bg-teal-700',
  SAND_50: 'bg-sand-50',
};

type ChipOption<T extends string> = {
  value: T;
  label: string;
  title?: string;
};

function ChipGroup<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: ChipOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            title={option.title ?? option.label}
            onClick={() => onChange(option.value)}
            className={`rounded-button px-2.5 py-1.5 text-xs font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal-700/15 ${
              active
                ? 'bg-teal-700 text-sand-50 shadow-[0_4px_12px_rgba(29,111,140,0.28)]'
                : 'border border-brown-800/15 bg-white text-brown-800 hover:bg-sand-50'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ColorSwatchGroup({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: EditorColorToken;
  options: { value: EditorColorToken; label: string }[];
  onChange: (value: EditorColorToken) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={`size-8 rounded-button border outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-teal-700/15 ${COLOR_SWATCH[option.value]} ${
              active
                ? 'border-teal-700 ring-2 ring-teal-700/40'
                : 'border-brown-800/25 hover:border-brown-800/50'
            }`}
          />
        );
      })}
    </div>
  );
}

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
    case 'LIST':
      return labels.listTitle;
  }
}

function typeOptions(labels: BlockInspectorLabels): ChipOption<EditorBlock['type']>[] {
  return [
    { value: 'HEADING', label: labels.headingTitle },
    { value: 'PARAGRAPH', label: labels.paragraphTitle },
    { value: 'LIST', label: labels.listTitle },
    { value: 'IMAGE', label: labels.imageTitle },
    { value: 'AUDIO', label: labels.audioTitle },
    { value: 'VIDEO', label: labels.videoTitle },
  ];
}

function textRoleOptions(labels: BlockInspectorLabels): ChipOption<EditorTextRole>[] {
  return [
    { value: 'HERO', label: labels.roleHero },
    { value: 'H2', label: labels.roleH2 },
    { value: 'H3', label: labels.roleH3 },
    { value: 'BODY', label: labels.roleBody },
    { value: 'CAPTION', label: labels.roleCaption },
  ];
}

function colorTokenOptions(
  labels: BlockInspectorLabels,
): { value: EditorColorToken; label: string }[] {
  return [
    { value: 'BROWN_950', label: labels.colorBrown950 },
    { value: 'BROWN_800', label: labels.colorBrown800 },
    { value: 'BROWN_600', label: labels.colorBrown600 },
    { value: 'TEAL_700', label: labels.colorTeal700 },
    { value: 'SAND_50', label: labels.colorSand50 },
  ];
}

function listStyleOptions(labels: BlockInspectorLabels): ChipOption<ListStyle>[] {
  return [
    { value: 'BULLET', label: labels.listBullet },
    { value: 'NUMBERED', label: labels.listNumbered },
  ];
}

function alignOptions(labels: BlockInspectorLabels): ChipOption<EditorAlign>[] {
  return [
    { value: 'START', label: labels.alignStart },
    { value: 'CENTER', label: labels.alignCenter },
    { value: 'END', label: labels.alignEnd },
  ];
}

/**
 * Side panel (desktop) / bottom sheet (mobile) for the selected document-canvas block.
 * Fully controlled — the caller (`BlockListEditor` shell) owns `selectedKey` and
 * translates `onChange`/`onConvertType`/`onMove`/`onDelete` into the flat `EditorBlock[]`
 * update, reusing `convertBlockType`/`moveBlock` from `lib/block-editor-utils.ts`.
 *
 * Text style controls use chip groups / color swatches instead of nested Selects so the
 * narrow inspector stays scannable and matches the canvas preview immediately.
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
          <ChipGroup
            value={current.type}
            onChange={onConvertType}
            options={typeOptions(labels)}
            ariaLabel={labels.blockType}
          />
        </Field>

        {current.type === 'HEADING' || current.type === 'PARAGRAPH' ? (
          <>
            <Field label={labels.textRole}>
              <ChipGroup
                value={current.textRole}
                onChange={(value) => onChange({ textRole: value })}
                options={textRoleOptions(labels)}
                ariaLabel={labels.textRole}
              />
            </Field>
            <Field label={labels.colorToken}>
              <ColorSwatchGroup
                value={current.colorToken}
                onChange={(value) => onChange({ colorToken: value })}
                options={colorTokenOptions(labels)}
                ariaLabel={labels.colorToken}
              />
            </Field>
            <Field label={labels.align}>
              <ChipGroup
                value={current.align}
                onChange={(value) => onChange({ align: value })}
                options={alignOptions(labels)}
                ariaLabel={labels.align}
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
              previewUrl={current.previewUrl ?? null}
              hasFile={Boolean(current.mediaId || current.clientFileKey || current.previewUrl)}
              labels={{
                pick: labels.pickAudio,
                change: labels.changeAudio,
                remove: labels.removeAudio,
                attached: labels.audioAttached,
              }}
              onPick={(file) => onPickFile?.(current, file)}
              onRemove={() =>
                onChange({ mediaId: undefined, clientFileKey: undefined, previewUrl: undefined })
              }
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

        {current.type === 'LIST' ? (
          <>
            <Field label={labels.listStyle}>
              <ChipGroup
                value={current.listStyle}
                onChange={(value) => onChange({ listStyle: value })}
                options={listStyleOptions(labels)}
                ariaLabel={labels.listStyle}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <ActionButton
                type="button"
                variant="secondary"
                onClick={() =>
                  onChange({
                    items: [...current.items, { spans: [{ text: '' }] }],
                  } satisfies Partial<EditorListBlock>)
                }
              >
                {labels.addListItem}
              </ActionButton>
              <ActionButton
                type="button"
                variant="ghost"
                disabled={current.items.length <= 1}
                onClick={() =>
                  onChange({
                    items: current.items.slice(0, -1),
                  } satisfies Partial<EditorListBlock>)
                }
              >
                {labels.removeListItem}
              </ActionButton>
            </div>
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

  function renderEmpty() {
    return (
      <div className="rounded-button border border-dashed border-brown-800/20 px-3 py-8 text-center">
        <p className="text-[15px] leading-relaxed text-brown-600">{labels.inspectorEmpty}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop / tablet (>=700px, --breakpoint-md): always-visible sticky panel. */}
      <aside className="hidden md:sticky md:top-4 md:block md:w-[280px] md:shrink-0 md:self-start md:space-y-3 md:rounded-card md:border md:border-brown-800/15 md:bg-white md:p-4">
        {block ? renderFields(block) : renderEmpty()}
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
