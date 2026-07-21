import { createSiteFullSchema } from '@heritage/shared-types';

describe('createSiteFullSchema', () => {
  it('accepts fa+en+ar spans blocks and video embed', () => {
    const parsed = createSiteFullSchema.parse({
      slug: 'test-site',
      category: 'HISTORICAL',
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
              spans: [{ text: 'متن', bold: true }],
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
              spans: [{ text: 'Body', href: 'https://example.com' }],
            },
          ],
        },
        {
          locale: 'ar',
          title: 'العنوان',
          shortDescription: 'قصير',
          blocks: [
            {
              type: 'PARAGRAPH',
              textRole: 'BODY',
              colorToken: 'BROWN_800',
              align: 'START',
              spans: [{ text: 'نص' }],
            },
          ],
        },
      ],
    });
    expect(parsed.translations).toHaveLength(3);
  });

  it('accepts food category without coordinates and list blocks', () => {
    const parsed = createSiteFullSchema.parse({
      slug: 'kermanshah-koofte',
      category: 'FOOD',
      cityId: 'city1',
      translations: [
        {
          locale: 'fa',
          title: 'کوفته',
          shortDescription: 'خوراک سنتی',
          blocks: [
            {
              type: 'LIST',
              listStyle: 'NUMBERED',
              items: [{ spans: [{ text: 'گوشت چرخ‌کرده را آماده کنید.' }] }],
            },
          ],
        },
        {
          locale: 'en',
          title: 'Koofte',
          shortDescription: 'Traditional dish',
          blocks: [
            {
              type: 'LIST',
              listStyle: 'BULLET',
              items: [{ spans: [{ text: 'Prepare the minced meat.' }] }],
            },
          ],
        },
        {
          locale: 'ar',
          title: 'كوفته',
          shortDescription: 'طبق تقليدي',
          blocks: [
            {
              type: 'LIST',
              listStyle: 'BULLET',
              items: [{ spans: [{ text: 'حضّر اللحم المفروم.' }] }],
            },
          ],
        },
      ],
    });
    expect(parsed.lat).toBeUndefined();
    expect(parsed.category).toBe('FOOD');
  });

  it('rejects historical category without coordinates', () => {
    expect(() =>
      createSiteFullSchema.parse({
        slug: 'taq-e-bostan',
        category: 'HISTORICAL',
        cityId: 'city1',
        translations: [
          { locale: 'fa', title: 'a', shortDescription: 'b', blocks: [] },
          { locale: 'en', title: 'a', shortDescription: 'b', blocks: [] },
          { locale: 'ar', title: 'a', shortDescription: 'b', blocks: [] },
        ],
      }),
    ).toThrow();
  });

  it('rejects missing ar translation', () => {
    expect(() =>
      createSiteFullSchema.parse({
        slug: 'x',
        category: 'HISTORICAL',
        lat: '1',
        lng: '2',
        cityId: 'c',
        translations: [
          { locale: 'fa', title: 'a', shortDescription: 'b', blocks: [] },
          { locale: 'en', title: 'a', shortDescription: 'b', blocks: [] },
        ],
      }),
    ).toThrow();
  });
});
