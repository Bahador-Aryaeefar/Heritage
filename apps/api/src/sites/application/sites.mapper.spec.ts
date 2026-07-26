import { ContentBlockType } from '@prisma/client';
import { mapBlock } from './sites.mapper';

const identity = (url: string) => url;

function baseBlock(overrides: Record<string, unknown>) {
  return {
    id: 'block-1',
    locale: 'en',
    type: ContentBlockType.PARAGRAPH,
    sortOrder: 0,
    textRole: 'BODY',
    colorToken: 'BROWN_950',
    align: 'START',
    listStyle: null,
    caption: null,
    spans: [],
    media: null,
    ...overrides,
  } as never;
}

describe('mapBlock read-path href sanitization', () => {
  it('drops an unsafe href from a HEADING/PARAGRAPH span instead of throwing, keeping the text', () => {
    const block = baseBlock({
      type: ContentBlockType.PARAGRAPH,
      spans: [
        { text: 'Safe', href: 'https://example.com' },
        { text: 'Unsafe legacy link', href: 'javascript:alert(1)' },
      ],
    });

    expect(() => mapBlock(block, identity)).not.toThrow();
    const result = mapBlock(block, identity);
    expect(result.type).toBe('PARAGRAPH');
    if (result.type !== 'PARAGRAPH') {
      throw new Error('expected PARAGRAPH block');
    }
    expect(result.spans[0]).toEqual({ text: 'Safe', href: 'https://example.com' });
    expect(result.spans[1].text).toBe('Unsafe legacy link');
    expect(result.spans[1].href).toBeUndefined();
  });

  it('drops an unsafe href from LIST item spans instead of throwing', () => {
    const block = baseBlock({
      type: ContentBlockType.LIST,
      listStyle: 'BULLET',
      spans: {
        items: [
          { spans: [{ text: 'Legacy tel link', href: 'tel:+15551234567' }] },
          { spans: [{ text: 'Fine', href: 'https://example.com' }] },
        ],
      },
    });

    expect(() => mapBlock(block, identity)).not.toThrow();
    const result = mapBlock(block, identity);
    expect(result.type).toBe('LIST');
    if (result.type !== 'LIST') {
      throw new Error('expected LIST block');
    }
    expect(result.items[0].spans[0].text).toBe('Legacy tel link');
    expect(result.items[0].spans[0].href).toBeUndefined();
    expect(result.items[1].spans[0]).toEqual({ text: 'Fine', href: 'https://example.com' });
  });
});
