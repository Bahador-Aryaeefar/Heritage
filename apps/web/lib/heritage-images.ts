// Local bundled hero photos + Wikimedia Commons URLs for landing topic banners.
export const heritageImages = {
  hero: {
    src: '/media/taq-e-bostan/cover.webp',
    altFa: 'نمای طاق‌بستان، کرمانشاه',
    altEn: 'Taq-e Bostan rock relief site, Kermanshah',
  },
  /** Intro to the QR / how-it-works block. */
  bannerHow: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Taq-e-Bostan_%28Iran%29_Sassanid_Period.JPG',
    altFa: 'طاق‌بستان، محل نصب پلاک QR',
    altEn: 'Taq-e Bostan, where heritage plaques meet the rock face',
  },
  bannerHistorical: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/History_History_IMG_7762_Bisotun%2C_Iran_%2812864252555%29.jpg',
    altFa: 'کتیبه و سنگ‌نگاره‌های بیستون',
    altEn: 'Bisotun relief and inscription, Kermanshah',
  },
  bannerHandicraft: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Kllash_Top-Bottom.jpg',
    altFa: 'گیوه و کلش سنتی',
    altEn: 'Traditional giveh / kullash footwear',
  },
  bannerStreet: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Brickwork_Facade%2C_Modarres_Street%2C_Kermanshah%2C_Iranian_Kurdistan_%282%29.jpg',
    altFa: 'آجرکاری خیابان مدرس، کرمانشاه',
    altEn: 'Brickwork facade on Modarres Street, Kermanshah',
  },
  bannerLandmark: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Kermanshah_20190214_02.jpg',
    altFa: 'نمای شهری کرمانشاه',
    altEn: 'Urban view of Kermanshah',
  },
  bannerFood: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Kebab_Bakhtyari.jpg',
    altFa: 'کباب سنتی ایرانی',
    altEn: 'Traditional Iranian kebab',
  },
} as const;

export type LandingBannerKey =
  | 'how'
  | 'HISTORICAL'
  | 'HANDICRAFT'
  | 'STREET'
  | 'LANDMARK'
  | 'FOOD';

export const landingBannerImages: Record<
  LandingBannerKey,
  (typeof heritageImages)[keyof typeof heritageImages]
> = {
  how: heritageImages.bannerHow,
  HISTORICAL: heritageImages.bannerHistorical,
  HANDICRAFT: heritageImages.bannerHandicraft,
  STREET: heritageImages.bannerStreet,
  LANDMARK: heritageImages.bannerLandmark,
  FOOD: heritageImages.bannerFood,
};
