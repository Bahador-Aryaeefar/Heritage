import {
  createBlockKey,
  type EditorAlign,
  type EditorBlock,
  type EditorColorToken,
  type EditorTextRole,
} from './copy-blocks-from-fa';

type EditorBlockType = EditorBlock['type'];

const TEXT_TYPES = new Set<EditorBlockType>(['HEADING', 'PARAGRAPH']);

const EMPTY_SPANS = [{ text: '' }] as const;

function isTextBlockType(type: EditorBlockType): boolean {
  return TEXT_TYPES.has(type);
}

function textDefaults(type: 'HEADING' | 'PARAGRAPH'): {
  textRole: EditorTextRole;
  colorToken: EditorColorToken;
  align: EditorAlign;
} {
  if (type === 'HEADING') {
    return { textRole: 'H2', colorToken: 'BROWN_950', align: 'START' };
  }
  return { textRole: 'BODY', colorToken: 'BROWN_800', align: 'START' };
}

export function createEmptyBlock(type: EditorBlockType): EditorBlock {
  const key = createBlockKey();

  switch (type) {
    case 'HEADING':
    case 'PARAGRAPH':
      return { key, type, spans: [{ text: '' }], ...textDefaults(type) };
    case 'IMAGE':
      return { key, type: 'IMAGE', caption: '' };
    case 'AUDIO':
      return { key, type: 'AUDIO', caption: '' };
    case 'VIDEO':
      return { key, type: 'VIDEO', caption: '', embedUrl: '' };
  }
}

export function convertBlockType(block: EditorBlock, next: EditorBlockType): EditorBlock {
  const { key } = block;
  const fromText = block.type === 'HEADING' || block.type === 'PARAGRAPH';
  const toText = next === 'HEADING' || next === 'PARAGRAPH';

  if (fromText && toText) {
    return {
      key,
      type: next,
      spans: block.spans.map((span) => ({ ...span })),
      ...textDefaults(next),
    };
  }

  if (fromText && !toText) {
    return emptyMediaBlock(key, next as 'IMAGE' | 'AUDIO' | 'VIDEO');
  }

  if (!fromText && toText) {
    return {
      key,
      type: next,
      spans: [...EMPTY_SPANS],
      ...textDefaults(next),
    };
  }

  const caption = 'caption' in block ? block.caption : '';
  return emptyMediaBlock(key, next as 'IMAGE' | 'AUDIO' | 'VIDEO', caption);
}

function emptyMediaBlock(key: string, type: Exclude<EditorBlockType, 'HEADING' | 'PARAGRAPH'>, caption = ''): EditorBlock {
  switch (type) {
    case 'IMAGE':
      return { key, type: 'IMAGE', caption };
    case 'AUDIO':
      return { key, type: 'AUDIO', caption };
    case 'VIDEO':
      return { key, type: 'VIDEO', caption, embedUrl: '' };
  }
}

export function moveBlock(
  blocks: EditorBlock[],
  key: string,
  direction: 'up' | 'down',
): EditorBlock[] {
  const index = blocks.findIndex((b) => b.key === key);
  if (index === -1) return blocks;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= blocks.length) return blocks;

  const next = blocks.slice();
  [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
  return next;
}

export function insertBlockAt(
  blocks: EditorBlock[],
  index: number,
  type: EditorBlockType,
): { blocks: EditorBlock[]; key: string } {
  const block = createEmptyBlock(type);
  const clamped = Math.max(0, Math.min(index, blocks.length));
  return {
    blocks: [...blocks.slice(0, clamped), block, ...blocks.slice(clamped)],
    key: block.key,
  };
}
