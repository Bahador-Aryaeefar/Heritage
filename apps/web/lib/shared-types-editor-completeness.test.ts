import { describe, expect, it } from 'vitest';
import {
  adminBlockWriteSchema,
  createSiteFullSchema,
  localeSchema,
  blockAlignSchema,
  textSpanSchema,
  mediaRefSchema,
} from '@heritage/shared-types';

describe('editor-completeness shared-types', () => {
  it('accepts ar locale and END align and href spans', () => {
    expect(localeSchema.parse('ar')).toBe('ar');
    expect(blockAlignSchema.parse('END')).toBe('END');
    expect(textSpanSchema.parse({ text: 'x', bold: true, href: 'https://example.com' }).href).toBe(
      'https://example.com',
    );
  });

  it('rejects media refs with alt fields stripped from schema', () => {
    const parsed = mediaRefSchema.parse({
      id: '1',
      type: 'IMAGE',
      url: '/x',
      embedUrl: null,
      durationSec: null,
    });
    expect(parsed).not.toHaveProperty('altFa');
  });

  it('requires fa+en+ar on create and text blocks use spans', () => {
    const text = adminBlockWriteSchema.parse({
      type: 'PARAGRAPH',
      textRole: 'BODY',
      colorToken: 'BROWN_800',
      align: 'END',
      spans: [{ text: 'hi', italic: true }],
    });
    expect(text).toMatchObject({ type: 'PARAGRAPH' });

    const base = {
      slug: 't',
      category: 'ANCIENT' as const,
      lat: '34',
      lng: '47',
      cityId: 'c',
      isActive: true,
      translations: [
        { locale: 'fa', title: 'ف', shortDescription: 'ف', blocks: [] },
        { locale: 'en', title: 'e', shortDescription: 'e', blocks: [] },
      ],
    };
    expect(createSiteFullSchema.safeParse(base).success).toBe(false);
    expect(
      createSiteFullSchema.safeParse({
        ...base,
        translations: [
          ...base.translations,
          { locale: 'ar', title: 'ع', shortDescription: 'ع', blocks: [] },
        ],
      }).success,
    ).toBe(true);
  });
});
