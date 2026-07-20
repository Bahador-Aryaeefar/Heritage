import { describe, expect, it } from 'vitest';
import { copyBlocksFromFa, type EditorBlock } from './copy-blocks-from-fa';

describe('copyBlocksFromFa', () => {
  it('gives every copied block a new, unique key', () => {
    const fa: EditorBlock[] = [
      { key: 'fa-1', type: 'HEADING', text: 'Title', textRole: 'H2', colorToken: 'BROWN_800', align: 'START' },
      { key: 'fa-2', type: 'PARAGRAPH', text: 'Body', textRole: 'BODY', colorToken: 'BROWN_800', align: 'START' },
    ];

    const copied = copyBlocksFromFa(fa);

    expect(copied).toHaveLength(2);
    expect(copied[0]!.key).not.toBe('fa-1');
    expect(copied[1]!.key).not.toBe('fa-2');
    expect(new Set(copied.map((b) => b.key)).size).toBe(2);
  });

  it('copies text/textRole/colorToken/align for HEADING and PARAGRAPH blocks', () => {
    const fa: EditorBlock[] = [
      { key: 'fa-1', type: 'HEADING', text: 'عنوان', textRole: 'HERO', colorToken: 'TEAL_700', align: 'CENTER' },
    ];

    const [copied] = copyBlocksFromFa(fa);

    expect(copied).toMatchObject({
      type: 'HEADING',
      text: 'عنوان',
      textRole: 'HERO',
      colorToken: 'TEAL_700',
      align: 'CENTER',
    });
  });

  it('preserves mediaId for an IMAGE block that already has an uploaded file', () => {
    const fa: EditorBlock[] = [
      { key: 'fa-img', type: 'IMAGE', caption: 'Cover shot', mediaId: 'media_123' },
    ];

    const [copied] = copyBlocksFromFa(fa);

    expect(copied).toMatchObject({ type: 'IMAGE', caption: 'Cover shot', mediaId: 'media_123' });
    expect((copied as { clientFileKey?: string }).clientFileKey).toBeUndefined();
    expect((copied as { previewUrl?: string }).previewUrl).toBeUndefined();
  });

  it('drops clientFileKey and previewUrl for an IMAGE block staged but not yet saved', () => {
    const fa: EditorBlock[] = [
      {
        key: 'fa-img',
        type: 'IMAGE',
        caption: 'Pending upload',
        clientFileKey: 'file_abc',
        previewUrl: 'blob:staged-preview',
      },
    ];

    const [copied] = copyBlocksFromFa(fa);

    expect(copied).toMatchObject({ type: 'IMAGE', caption: 'Pending upload' });
    expect((copied as { mediaId?: string }).mediaId).toBeUndefined();
    expect((copied as { clientFileKey?: string }).clientFileKey).toBeUndefined();
    expect((copied as { previewUrl?: string }).previewUrl).toBeUndefined();
  });

  it('preserves mediaId and drops clientFileKey for an AUDIO block', () => {
    const fa: EditorBlock[] = [
      { key: 'fa-audio', type: 'AUDIO', caption: 'Narration', mediaId: 'media_456', clientFileKey: 'file_xyz' },
    ];

    const [copied] = copyBlocksFromFa(fa);

    expect(copied).toMatchObject({ type: 'AUDIO', caption: 'Narration', mediaId: 'media_456' });
    expect((copied as { clientFileKey?: string }).clientFileKey).toBeUndefined();
  });

  it('preserves mediaId, caption, and embedUrl for a VIDEO block', () => {
    const fa: EditorBlock[] = [
      {
        key: 'fa-video',
        type: 'VIDEO',
        caption: 'Walkthrough',
        embedUrl: 'https://www.aparat.com/v/abc123',
        mediaId: 'media_789',
      },
    ];

    const [copied] = copyBlocksFromFa(fa);

    expect(copied).toMatchObject({
      type: 'VIDEO',
      caption: 'Walkthrough',
      embedUrl: 'https://www.aparat.com/v/abc123',
      mediaId: 'media_789',
    });
  });

  it('omits mediaId for a VIDEO block that never had one', () => {
    const fa: EditorBlock[] = [
      { key: 'fa-video', type: 'VIDEO', caption: '', embedUrl: 'https://www.aparat.com/v/def456' },
    ];

    const [copied] = copyBlocksFromFa(fa);

    expect((copied as { mediaId?: string }).mediaId).toBeUndefined();
  });

  it('preserves order and does not mutate the input array', () => {
    const fa: EditorBlock[] = [
      { key: 'fa-1', type: 'HEADING', text: 'A', textRole: 'H2', colorToken: 'BROWN_800', align: 'START' },
      { key: 'fa-2', type: 'IMAGE', caption: 'B', mediaId: 'media_1' },
      { key: 'fa-3', type: 'AUDIO', caption: 'C' },
    ];
    const snapshot = JSON.parse(JSON.stringify(fa));

    const copied = copyBlocksFromFa(fa);

    expect(copied.map((b) => b.type)).toEqual(['HEADING', 'IMAGE', 'AUDIO']);
    expect(fa).toEqual(snapshot);
  });

  it('returns an empty array for an empty input', () => {
    expect(copyBlocksFromFa([])).toEqual([]);
  });
});
