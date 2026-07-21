import { describe, expect, it } from 'vitest';
import type { EditorBlock } from './copy-blocks-from-fa';
import {
  convertBlockType,
  createEmptyBlock,
  insertBlockAt,
  moveBlock,
} from './block-editor-utils';

describe('createEmptyBlock', () => {
  it('creates HEADING with default text styling', () => {
    const block = createEmptyBlock('HEADING');
    expect(block.type).toBe('HEADING');
    expect(block.key).toBeTruthy();
    if (block.type !== 'HEADING') throw new Error('expected HEADING');
    expect(block).toMatchObject({
      spans: [{ text: '' }],
      textRole: 'H2',
      colorToken: 'BROWN_950',
      align: 'START',
    });
  });

  it('creates PARAGRAPH with default text styling', () => {
    const block = createEmptyBlock('PARAGRAPH');
    expect(block.type).toBe('PARAGRAPH');
    if (block.type !== 'PARAGRAPH') throw new Error('expected PARAGRAPH');
    expect(block).toMatchObject({
      spans: [{ text: '' }],
      textRole: 'BODY',
      colorToken: 'BROWN_800',
      align: 'START',
    });
  });

  it('creates IMAGE with empty caption and no staged media', () => {
    const block = createEmptyBlock('IMAGE');
    expect(block).toMatchObject({ type: 'IMAGE', caption: '' });
    expect((block as { mediaId?: string }).mediaId).toBeUndefined();
    expect((block as { clientFileKey?: string }).clientFileKey).toBeUndefined();
  });

  it('creates AUDIO with empty caption and no staged media', () => {
    const block = createEmptyBlock('AUDIO');
    expect(block).toMatchObject({ type: 'AUDIO', caption: '' });
    expect((block as { mediaId?: string }).mediaId).toBeUndefined();
    expect((block as { clientFileKey?: string }).clientFileKey).toBeUndefined();
  });

  it('creates VIDEO with empty embedUrl and caption', () => {
    const block = createEmptyBlock('VIDEO');
    expect(block).toMatchObject({ type: 'VIDEO', caption: '', embedUrl: '' });
    expect((block as { mediaId?: string }).mediaId).toBeUndefined();
  });
});

describe('convertBlockType', () => {
  it('keeps spans when converting HEADING to PARAGRAPH and applies paragraph defaults', () => {
    const block: EditorBlock = {
      key: 'keep-me',
      type: 'HEADING',
      spans: [{ text: 'Hello', bold: true }],
      textRole: 'HERO',
      colorToken: 'TEAL_700',
      align: 'CENTER',
    };

    const next = convertBlockType(block, 'PARAGRAPH');

    expect(next.key).toBe('keep-me');
    expect(next).toMatchObject({
      type: 'PARAGRAPH',
      spans: [{ text: 'Hello', bold: true }],
      textRole: 'BODY',
      colorToken: 'BROWN_800',
      align: 'START',
    });
  });

  it('drops spans when converting PARAGRAPH to IMAGE', () => {
    const block: EditorBlock = {
      key: 'p1',
      type: 'PARAGRAPH',
      spans: [{ text: 'Body copy' }],
      textRole: 'BODY',
      colorToken: 'BROWN_800',
      align: 'START',
    };

    const next = convertBlockType(block, 'IMAGE');

    expect(next.key).toBe('p1');
    expect(next).toMatchObject({ type: 'IMAGE', caption: '' });
    expect('spans' in next).toBe(false);
    expect((next as { mediaId?: string }).mediaId).toBeUndefined();
  });
});

describe('moveBlock', () => {
  const blocks: EditorBlock[] = [
    { key: 'a', type: 'HEADING', spans: [{ text: 'A' }], textRole: 'H2', colorToken: 'BROWN_950', align: 'START' },
    { key: 'b', type: 'PARAGRAPH', spans: [{ text: 'B' }], textRole: 'BODY', colorToken: 'BROWN_800', align: 'START' },
    { key: 'c', type: 'PARAGRAPH', spans: [{ text: 'C' }], textRole: 'BODY', colorToken: 'BROWN_800', align: 'START' },
  ];

  it('swaps a block with the one above when moving up', () => {
    const moved = moveBlock(blocks, 'b', 'up');
    expect(moved.map((b) => b.key)).toEqual(['b', 'a', 'c']);
  });

  it('swaps a block with the one below when moving down', () => {
    const moved = moveBlock(blocks, 'b', 'down');
    expect(moved.map((b) => b.key)).toEqual(['a', 'c', 'b']);
  });

  it('does not move the first block up', () => {
    const moved = moveBlock(blocks, 'a', 'up');
    expect(moved.map((b) => b.key)).toEqual(['a', 'b', 'c']);
  });

  it('does not move the last block down', () => {
    const moved = moveBlock(blocks, 'c', 'down');
    expect(moved.map((b) => b.key)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const snapshot = JSON.parse(JSON.stringify(blocks));
    moveBlock(blocks, 'b', 'up');
    expect(blocks).toEqual(snapshot);
  });
});

describe('insertBlockAt', () => {
  const blocks: EditorBlock[] = [
    { key: 'a', type: 'HEADING', spans: [{ text: 'A' }], textRole: 'H2', colorToken: 'BROWN_950', align: 'START' },
  ];

  it('inserts a new block at the given index and returns its key', () => {
    const { blocks: next, key } = insertBlockAt(blocks, 1, 'PARAGRAPH');

    expect(next).toHaveLength(2);
    expect(next[0]!.key).toBe('a');
    expect(next[1]!.key).toBe(key);
    expect(next[1]).toMatchObject({ type: 'PARAGRAPH', spans: [{ text: '' }] });
  });

  it('inserts at the start when index is 0', () => {
    const { blocks: next, key } = insertBlockAt(blocks, 0, 'IMAGE');

    expect(next).toHaveLength(2);
    expect(next[0]!.key).toBe(key);
    expect(next[0]!.type).toBe('IMAGE');
    expect(next[1]!.key).toBe('a');
  });
});
