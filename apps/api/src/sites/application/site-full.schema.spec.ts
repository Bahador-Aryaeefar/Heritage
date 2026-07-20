import {
  createSiteFullSchema,
  updateSiteFullSchema,
} from '@heritage/shared-types';

describe('createSiteFullSchema', () => {
  it('accepts fa+en text blocks and video embed', () => {
    const parsed = createSiteFullSchema.parse({
      slug: 'test-site',
      category: 'ANCIENT',
      lat: '34.3',
      lng: '47.1',
      cityId: 'city1',
      isActive: true,
      cover: { clientFileKey: 'cover' },
      translations: [
        {
          locale: 'fa',
          title: 'عنوان',
          shortDescription: 'کوتاه',
          blocks: [
            {
              type: 'PARAGRAPH',
              textRole: 'BODY',
              colorToken: 'BROWN_800',
              align: 'START',
              text: 'متن',
            },
            {
              type: 'VIDEO',
              embedUrl: 'https://www.aparat.com/v/abc',
              caption: 'ویدیو',
            },
          ],
        },
        {
          locale: 'en',
          title: 'Title',
          shortDescription: 'Short',
          blocks: [
            {
              type: 'PARAGRAPH',
              textRole: 'BODY',
              colorToken: 'BROWN_800',
              align: 'START',
              text: 'Body',
            },
          ],
        },
      ],
    });
    expect(parsed.translations).toHaveLength(2);
  });

  it('rejects missing en translation', () => {
    expect(() =>
      createSiteFullSchema.parse({
        slug: 'x',
        category: 'ANCIENT',
        lat: '1',
        lng: '2',
        cityId: 'c',
        translations: [
          { locale: 'fa', title: 'a', shortDescription: 'b', blocks: [] },
        ],
      }),
    ).toThrow();
  });
});
