'use client';

import { ActionButton } from '@/components/ui/action-button';
import { Field, TextArea, TextInput } from '@/components/ui/text-field';
import { Select, type SelectOption } from '@/components/ui/select';
import { MediaFilePicker } from '@/components/admin/media-file-picker';
import {
  createBlockKey,
  type EditorAlign,
  type EditorAudioBlock,
  type EditorBlock,
  type EditorColorToken,
  type EditorImageBlock,
  type EditorTextRole,
} from '@/lib/copy-blocks-from-fa';

export type BlockListEditorLabels = {
  addHeading: string;
  addParagraph: string;
  addImage: string;
  addAudio: string;
  addVideo: string;
  /** "+ Add block" trigger (`BlockInsertMenu` end variant / inspector empty-state entry point). */
  addBlock: string;
  moveUp: string;
  moveDown: string;
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
   * Called when the user picks a raw file for an IMAGE/AUDIO block. This component stays
   * decoupled from hashing/optimizing (see `lib/file-hash.ts`, `lib/optimize-image.ts`) — the
   * caller is expected to process the file and then call `onChange` with the block's
   * `mediaId`/`clientFileKey`/`previewUrl` updated.
   */
  onPickFile?: (block: EditorImageBlock | EditorAudioBlock, file: File) => void;
};

function typeTitle(block: EditorBlock, labels: BlockListEditorLabels): string {
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

function textRoleOptions(labels: BlockListEditorLabels): SelectOption[] {
  return [
    { value: 'HERO', label: labels.roleHero },
    { value: 'H2', label: labels.roleH2 },
    { value: 'H3', label: labels.roleH3 },
    { value: 'BODY', label: labels.roleBody },
    { value: 'CAPTION', label: labels.roleCaption },
  ];
}

function colorTokenOptions(labels: BlockListEditorLabels): SelectOption[] {
  return [
    { value: 'BROWN_950', label: labels.colorBrown950 },
    { value: 'BROWN_800', label: labels.colorBrown800 },
    { value: 'BROWN_600', label: labels.colorBrown600 },
    { value: 'TEAL_700', label: labels.colorTeal700 },
    { value: 'SAND_50', label: labels.colorSand50 },
  ];
}

function alignOptions(labels: BlockListEditorLabels): SelectOption[] {
  return [
    { value: 'START', label: labels.alignStart },
    { value: 'CENTER', label: labels.alignCenter },
  ];
}

export function BlockListEditor({ value, onChange, labels, onPickFile }: BlockListEditorProps) {
  function updateBlock(key: string, patch: Partial<EditorBlock>) {
    onChange(
      value.map((block) => (block.key === key ? ({ ...block, ...patch } as EditorBlock) : block)),
    );
  }

  function removeBlock(key: string) {
    onChange(value.filter((block) => block.key !== key));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = value.slice();
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    onChange(next);
  }

  function addBlock(type: EditorBlock['type']) {
    const key = createBlockKey();
    if (type === 'HEADING' || type === 'PARAGRAPH') {
      onChange([
        ...value,
        {
          key,
          type,
          text: '',
          textRole: type === 'HEADING' ? 'H2' : 'BODY',
          colorToken: 'BROWN_800',
          align: 'START',
        },
      ]);
      return;
    }
    if (type === 'VIDEO') {
      onChange([...value, { key, type: 'VIDEO', caption: '', embedUrl: '' }]);
      return;
    }
    // IMAGE / AUDIO
    onChange([...value, { key, type, caption: '' }]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <ActionButton type="button" variant="secondary" onClick={() => addBlock('HEADING')}>
          {labels.addHeading}
        </ActionButton>
        <ActionButton type="button" variant="secondary" onClick={() => addBlock('PARAGRAPH')}>
          {labels.addParagraph}
        </ActionButton>
        <ActionButton type="button" variant="secondary" onClick={() => addBlock('IMAGE')}>
          {labels.addImage}
        </ActionButton>
        <ActionButton type="button" variant="secondary" onClick={() => addBlock('AUDIO')}>
          {labels.addAudio}
        </ActionButton>
        <ActionButton type="button" variant="secondary" onClick={() => addBlock('VIDEO')}>
          {labels.addVideo}
        </ActionButton>
      </div>

      {value.length === 0 ? <p className="text-[15px] text-brown-600">{labels.empty}</p> : null}

      <div className="space-y-4">
        {value.map((block, index) => (
          <div key={block.key} className="rounded-card border border-brown-800/15 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brown-800/10 pb-3">
              <span className="text-[15px] font-bold text-brown-950">{typeTitle(block, labels)}</span>
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  type="button"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => moveBlock(index, -1)}
                >
                  {labels.moveUp}
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="ghost"
                  disabled={index === value.length - 1}
                  onClick={() => moveBlock(index, 1)}
                >
                  {labels.moveDown}
                </ActionButton>
                <ActionButton type="button" variant="ghost" onClick={() => removeBlock(block.key)}>
                  {labels.delete}
                </ActionButton>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {block.type === 'HEADING' || block.type === 'PARAGRAPH' ? (
                <>
                  <Field label={labels.text}>
                    <TextArea
                      rows={block.type === 'HEADING' ? 2 : 4}
                      value={block.text}
                      onChange={(event) => updateBlock(block.key, { text: event.target.value })}
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label={labels.textRole}>
                      <Select
                        value={block.textRole}
                        onChange={(v) => updateBlock(block.key, { textRole: v as EditorTextRole })}
                        options={textRoleOptions(labels)}
                      />
                    </Field>
                    <Field label={labels.colorToken}>
                      <Select
                        value={block.colorToken}
                        onChange={(v) =>
                          updateBlock(block.key, { colorToken: v as EditorColorToken })
                        }
                        options={colorTokenOptions(labels)}
                      />
                    </Field>
                    <Field label={labels.align}>
                      <Select
                        value={block.align}
                        onChange={(v) => updateBlock(block.key, { align: v as EditorAlign })}
                        options={alignOptions(labels)}
                      />
                    </Field>
                  </div>
                </>
              ) : null}

              {block.type === 'IMAGE' ? (
                <>
                  <Field label={labels.caption}>
                    <TextInput
                      value={block.caption}
                      onChange={(event) => updateBlock(block.key, { caption: event.target.value })}
                    />
                  </Field>
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
                      updateBlock(block.key, {
                        mediaId: undefined,
                        clientFileKey: undefined,
                        previewUrl: undefined,
                      })
                    }
                  />
                </>
              ) : null}

              {block.type === 'AUDIO' ? (
                <>
                  <Field label={labels.caption}>
                    <TextInput
                      value={block.caption}
                      onChange={(event) => updateBlock(block.key, { caption: event.target.value })}
                    />
                  </Field>
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
                    onRemove={() =>
                      updateBlock(block.key, { mediaId: undefined, clientFileKey: undefined })
                    }
                  />
                </>
              ) : null}

              {block.type === 'VIDEO' ? (
                <>
                  <Field label={labels.caption}>
                    <TextInput
                      value={block.caption}
                      onChange={(event) => updateBlock(block.key, { caption: event.target.value })}
                    />
                  </Field>
                  <Field label={labels.embedUrl}>
                    <TextInput
                      value={block.embedUrl}
                      onChange={(event) => updateBlock(block.key, { embedUrl: event.target.value })}
                      dir="ltr"
                    />
                  </Field>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
