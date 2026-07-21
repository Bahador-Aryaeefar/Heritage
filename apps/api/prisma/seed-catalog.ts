import {
  BlockAlign,
  ColorToken,
  ContentBlockType,
  ListStyle,
  SiteCategory,
  TextRole,
  type Prisma,
} from '@prisma/client';

type TextSpan = { text: string; bold?: boolean; italic?: boolean };
type LocaleText = { fa: string; en: string; ar: string };

export type SeedTextBlock = {
  sortOrder: number;
  type: typeof ContentBlockType.HEADING | typeof ContentBlockType.PARAGRAPH;
  textRole: TextRole;
  colorToken: ColorToken;
  align: BlockAlign;
  spans: TextSpan[];
};

export type SeedListBlock = {
  sortOrder: number;
  type: typeof ContentBlockType.LIST;
  listStyle: ListStyle;
  spans: { items: Array<{ spans: TextSpan[] }> };
};

export type SeedMediaBlock = {
  sortOrder: number;
  type:
    typeof ContentBlockType.IMAGE | typeof ContentBlockType.AUDIO | typeof ContentBlockType.VIDEO;
  mediaId: string;
  caption: string | null;
};

export type SeedBlock = SeedTextBlock | SeedListBlock | SeedMediaBlock;

export type SeedTranslation = {
  locale: 'fa' | 'en' | 'ar';
  title: string;
  shortDescription: string;
};

export type SeedMediaIds = {
  coverMediaId: string | null;
  audioMediaId: string;
  videoMediaId: string | null;
};

export type SeedSiteDefinition = {
  slug: string;
  category: SiteCategory;
  lat: string | null;
  lng: string | null;
  qrCode: string;
  coverUrl: string | null;
  coverLabel: string;
  aparatEmbed: string | null;
  translations: SeedTranslation[];
  buildBlocks: (media: SeedMediaIds) => Record<'fa' | 'en' | 'ar', SeedBlock[]>;
};

const body = ColorToken.BROWN_800;
const heading = ColorToken.BROWN_950;

function h(sortOrder: number, text: string, role: TextRole = TextRole.H2): SeedTextBlock {
  return {
    sortOrder,
    type: ContentBlockType.HEADING,
    textRole: role,
    colorToken: role === TextRole.HERO ? ColorToken.BROWN_800 : heading,
    align: role === TextRole.HERO ? BlockAlign.CENTER : BlockAlign.START,
    spans: [{ text }],
  };
}

function p(sortOrder: number, text: string): SeedTextBlock {
  return {
    sortOrder,
    type: ContentBlockType.PARAGRAPH,
    textRole: TextRole.BODY,
    colorToken: body,
    align: BlockAlign.START,
    spans: [{ text }],
  };
}

function list(sortOrder: number, style: ListStyle, items: string[]): SeedListBlock {
  return {
    sortOrder,
    type: ContentBlockType.LIST,
    listStyle: style,
    spans: { items: items.map((text) => ({ spans: [{ text }] })) },
  };
}

function media(
  sortOrder: number,
  type: SeedMediaBlock['type'],
  mediaId: string,
  caption: string | null,
): SeedMediaBlock {
  return { sortOrder, type, mediaId, caption };
}

function photoBlocks(opts: {
  title: LocaleText;
  intro: LocaleText;
  section: LocaleText;
  body: LocaleText;
  imageCaption: LocaleText;
  listItems?: { fa: string[]; en: string[]; ar: string[] };
  media: SeedMediaIds;
}): Record<'fa' | 'en' | 'ar', SeedBlock[]> {
  const build = (locale: 'fa' | 'en' | 'ar'): SeedBlock[] => {
    const blocks: SeedBlock[] = [h(0, opts.title[locale], TextRole.HERO), p(1, opts.intro[locale])];
    let next = 2;
    if (opts.media.coverMediaId) {
      blocks.push(
        media(next, ContentBlockType.IMAGE, opts.media.coverMediaId, opts.imageCaption[locale]),
      );
      next += 1;
    }
    blocks.push(h(next, opts.section[locale]), p(next + 1, opts.body[locale]));
    next += 2;
    if (opts.listItems) {
      blocks.push(list(next, ListStyle.NUMBERED, opts.listItems[locale]));
      next += 1;
    }
    blocks.push(
      media(
        next,
        ContentBlockType.AUDIO,
        opts.media.audioMediaId,
        {
          fa: 'راهنمای صوتی کوتاه (نمونه)',
          en: 'Short audio guide (sample)',
          ar: 'دليل صوتي قصير (عينة)',
        }[locale],
      ),
    );
    return blocks;
  };
  return { fa: build('fa'), en: build('en'), ar: build('ar') };
}

type SiteInput = {
  slug: string;
  category: SiteCategory;
  lat?: string | null;
  lng?: string | null;
  qrCode: string;
  coverUrl: string;
  coverLabel: string;
  title: LocaleText;
  short: LocaleText;
  intro: LocaleText;
  section: LocaleText;
  body: LocaleText;
  imageCaption: LocaleText;
  listItems?: { fa: string[]; en: string[]; ar: string[] };
};

function defineSite(input: SiteInput): SeedSiteDefinition {
  const needsCoords =
    input.category === SiteCategory.HISTORICAL ||
    input.category === SiteCategory.STREET ||
    input.category === SiteCategory.LANDMARK;

  return {
    slug: input.slug,
    category: input.category,
    lat: needsCoords ? (input.lat ?? '34.3145000') : null,
    lng: needsCoords ? (input.lng ?? '47.0652000') : null,
    qrCode: input.qrCode,
    coverUrl: input.coverUrl,
    coverLabel: input.coverLabel,
    aparatEmbed: null,
    translations: [
      { locale: 'fa', title: input.title.fa, shortDescription: input.short.fa },
      { locale: 'en', title: input.title.en, shortDescription: input.short.en },
      { locale: 'ar', title: input.title.ar, shortDescription: input.short.ar },
    ],
    buildBlocks: (mediaIds) =>
      photoBlocks({
        media: mediaIds,
        title: input.title,
        intro: input.intro,
        section: input.section,
        body: input.body,
        imageCaption: input.imageCaption,
        listItems: input.listItems,
      }),
  };
}

export function toPrismaBlock(
  siteId: string,
  locale: string,
  block: SeedBlock,
): Prisma.SiteContentBlockCreateManyInput {
  switch (block.type) {
    case ContentBlockType.LIST:
      return {
        siteId,
        locale,
        sortOrder: block.sortOrder,
        type: block.type,
        listStyle: block.listStyle,
        spans: block.spans,
      };
    case ContentBlockType.HEADING:
    case ContentBlockType.PARAGRAPH:
      return {
        siteId,
        locale,
        sortOrder: block.sortOrder,
        type: block.type,
        textRole: block.textRole,
        colorToken: block.colorToken,
        align: block.align,
        spans: block.spans,
      };
    case ContentBlockType.IMAGE:
    case ContentBlockType.AUDIO:
    case ContentBlockType.VIDEO:
      return {
        siteId,
        locale,
        sortOrder: block.sortOrder,
        type: block.type,
        mediaId: block.mediaId,
        caption: block.caption,
      };
    default:
      throw new Error(`Unsupported seed block type: ${(block as SeedBlock).type}`);
  }
}

/** Five example entries per tourism category (covers from Wikimedia Commons; no videos). */
export const SEED_SITES: SeedSiteDefinition[] = [
  // --- HISTORICAL ---
  defineSite({
    slug: 'taq-e-bostan',
    category: SiteCategory.HISTORICAL,
    lat: '34.3872000',
    lng: '47.1332000',
    qrCode: 'TQB-SEED-001',
    coverUrl:
      'https://upload.wikimedia.org/wikipedia/commons/a/a8/Taq-e-Bostan_%28Iran%29_Sassanid_Period.JPG',
    coverLabel: 'Taq-e Bostan',
    title: { fa: 'طاق بستان', en: 'Taq-e Bostan', ar: 'طاق بستان' },
    short: {
      fa: 'مجموعه سنگ‌نگاره‌های ساسانی در دل کوهستان کرمانشاه.',
      en: 'Sasanian rock reliefs carved into the mountains near Kermanshah.',
      ar: 'نقوش صخرية ساسانية محفورة في جبال كرمانشاه.',
    },
    intro: {
      fa: 'طاق بستان یکی از درخشان‌ترین مجموعه‌های سنگ‌نگاره ساسانی است؛ ایوان‌های سنگی صحنه تاج‌گذاری و شکار را روایت می‌کنند.',
      en: 'Taq-e Bostan is one of the finest Sasanian rock-relief complexes; stone iwans tell of royal investiture and hunting.',
      ar: 'طاق بستان من أبرز مجموعات النقوش الساسانية؛ الإيوانات تروي مشاهد التتويج والصيد.',
    },
    section: { fa: 'چرا اینجا مهم است؟', en: 'Why it matters', ar: 'لماذا يهم؟' },
    body: {
      fa: 'کنار چشمه‌های طبیعی و مسیرهای کهن، هنوز از اصلی‌ترین مقاصد گردشگری فرهنگی استان است.',
      en: 'Beside natural springs and historic routes, it remains a primary cultural destination.',
      ar: 'بجانب الينابيع والطرق القديمة، ما زال من أهم الوجهات الثقافية.',
    },
    imageCaption: {
      fa: 'نمای ایوان بزرگ طاق بستان',
      en: 'The great iwan at Taq-e Bostan',
      ar: 'الإيوان الكبير في طاق بستان',
    },
  }),
  defineSite({
    slug: 'bisotun',
    category: SiteCategory.HISTORICAL,
    lat: '34.3904000',
    lng: '47.4369000',
    qrCode: 'HIS-SEED-002',
    coverUrl:
      'https://upload.wikimedia.org/wikipedia/commons/3/3f/History_History_IMG_7762_Bisotun%2C_Iran_%2812864252555%29.jpg',
    coverLabel: 'Bisotun',
    title: { fa: 'بیستون', en: 'Bisotun', ar: 'بيستون' },
    short: {
      fa: 'کتیبه و نقش‌برجسته‌های داریوش بزرگ؛ میراث جهانی یونسکو.',
      en: "Darius the Great's inscription and reliefs. A UNESCO World Heritage site.",
      ar: 'نقش وكتابات داريوس الكبير. موقع تراث عالمي لليونسكو.',
    },
    intro: {
      fa: 'بیستون در دامنه کوه، داستان پیروزی‌های هخامنشی را به سه زبان بر سنگ حک کرده است.',
      en: 'At the foot of the mountain, Bisotun records Achaemenid victories in three languages carved in stone.',
      ar: 'عند سفح الجبل تسجّل بيستون انتصارات الأخمينيين بثلاث لغات منحوتة في الصخر.',
    },
    section: { fa: 'بازدید', en: 'Visiting', ar: 'الزيارة' },
    body: {
      fa: 'محوطه باز است؛ برای دیدن جزئیات کتیبه، صبح زود یا نزدیک غروب نور بهتری دارد.',
      en: 'The site is open-air; morning or late-afternoon light helps read the inscription detail.',
      ar: 'الموقع مفتوح؛ ضوء الصباح أو العصر يساعد على قراءة تفاصيل النقش.',
    },
    imageCaption: { fa: 'نمایی از بیستون', en: 'A view of Bisotun', ar: 'منظر من بيستون' },
  }),
  defineSite({
    slug: 'anahita-kangavar',
    category: SiteCategory.HISTORICAL,
    lat: '34.5044000',
    lng: '47.9656000',
    qrCode: 'HIS-SEED-003',
    coverUrl:
      'https://upload.wikimedia.org/wikipedia/commons/5/52/Temple_of_Anahita%2C_Kangavar_09.jpg',
    coverLabel: 'Temple of Anahita',
    title: { fa: 'معبد آناهیتا', en: 'Temple of Anahita', ar: 'معبد آناهيتا' },
    short: {
      fa: 'بقایای معبد باستانی در کنگاور، در مسیر کرمانشاه به همدان.',
      en: 'Ruins of an ancient temple in Kangavar, on the Kermanshah-Hamadan road.',
      ar: 'أطلال معبد قديم في كنجاور على طريق كرمانشاه-همدان.',
    },
    intro: {
      fa: 'ستون‌ها و سکوهای سنگی معبد آناهیتا یادگار معماری دوران اشکانی-ساسانی در دشت کنگاورند.',
      en: 'Stone platforms and columns of the Anahita temple recall Parthian-Sasanian architecture on the Kangavar plain.',
      ar: 'منصات وأعمدة معبد آناهيتا تذكّر بالعمارة الفرثية-الساسانية في سهل كنجاور.',
    },
    section: { fa: 'نکته سفر', en: 'Travel note', ar: 'ملاحظة سفر' },
    body: {
      fa: 'بازدید کوتاه اما تأثیرگذار؛ کفش مناسب برای راه رفتن روی سنگ‌فرش توصیه می‌شود.',
      en: 'A short but striking stop; sturdy shoes help on the stone surfaces.',
      ar: 'توقف قصير ومؤثر؛ يُفضّل حذاء متين للمشي على الحجر.',
    },
    imageCaption: {
      fa: 'معبد آناهیتا در کنگاور',
      en: 'Temple of Anahita, Kangavar',
      ar: 'معبد آناهيتا في كنجاور',
    },
  }),
  defineSite({
    slug: 'tekyeh-moavenolmolk',
    category: SiteCategory.HISTORICAL,
    lat: '34.3168000',
    lng: '47.0689000',
    qrCode: 'HIS-SEED-004',
    coverUrl:
      'https://upload.wikimedia.org/wikipedia/commons/f/fa/Tekye_Moavenolmolk_Kermanshah3.jpg',
    coverLabel: 'Tekyeh Moaven ol-Molk',
    title: { fa: 'تکیه معاون‌الملک', en: 'Tekyeh Moaven ol-Molk', ar: 'تكية معاون الملك' },
    short: {
      fa: 'بنای آجری و کاشی‌کاری قاجاری در مرکز کرمانشاه؛ صحنه عزاداری و هنر.',
      en: 'A Qajar brick-and-tile tekyeh in central Kermanshah. Ritual space and art.',
      ar: 'تكية قاجارية من الآجر والبلاط في وسط كرمانشاه. مكان طقوسي وفن.',
    },
    intro: {
      fa: 'تکیه معاون‌الملک با سه حیاط و کاشی‌های روایی، از شاخص‌ترین بناهای مذهبی-فرهنگی شهر است.',
      en: "With three courtyards and narrative tilework, Tekyeh Moaven ol-Molk is among the city's finest religious-cultural buildings.",
      ar: 'بثلاث باحات وبلاط روائي، تعد تكية معاون الملك من أبرز المباني الدينية والثقافية في المدينة.',
    },
    section: { fa: 'چه ببینید', en: 'What to see', ar: 'ماذا ترى' },
    body: {
      fa: 'کاشی‌های رنگی، معماری حیاط‌ها و فضای آرام داخل بافت قدیمی را از دست ندهید.',
      en: "Don't miss the polychrome tiles, courtyard architecture, and the calm inside the old fabric.",
      ar: 'لا تفوّت البلاط الملون وعمارة الباحات والهدوء داخل النسيج القديم.',
    },
    imageCaption: {
      fa: 'نمایی از تکیه معاون‌الملک',
      en: 'Tekyeh Moaven ol-Molk',
      ar: 'تكية معاون الملك',
    },
  }),
  defineSite({
    slug: 'jameh-mosque-shafei',
    category: SiteCategory.HISTORICAL,
    lat: '34.3182000',
    lng: '47.0711000',
    qrCode: 'HIS-SEED-005',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Jameh_Mosque_of_Shafei.jpg',
    coverLabel: 'Jameh Mosque of Shafei',
    title: { fa: 'مسجد جامع شافعی', en: 'Jameh Mosque of Shafei', ar: 'المسجد الجامع الشافعي' },
    short: {
      fa: 'مسجد شاخص اهل سنت کرمانشاه با گنبد و منارهٔ دیدنی.',
      en: "Kermanshah's landmark Sunni congregational mosque with a striking dome and minaret.",
      ar: 'المسجد السني الجامع البارز في كرمانشاه بقبة ومئذنة مميزتين.',
    },
    intro: {
      fa: 'مسجد شافعی در بافت مرکزی شهر قرار دارد و از نمادهای همزیستی مذهبی کرمانشاه است.',
      en: "The Shafei mosque sits in the central fabric and is a symbol of Kermanshah's religious coexistence.",
      ar: 'يقع المسجد الشافعي في النسيج المركزي وهو رمز للتعايش الديني في كرمانشاه.',
    },
    section: { fa: 'بازدید محترمانه', en: 'Respectful visit', ar: 'زيارة محترمة' },
    body: {
      fa: 'در ساعات غیرنماز می‌توانید نمای بیرونی و فضای اطراف را ببینید؛ پوشش مناسب رعایت شود.',
      en: 'Outside prayer times you can enjoy the exterior and surroundings; dress respectfully.',
      ar: 'خارج أوقات الصلاة يمكن الاستمتاع بالواجهة والمحيط؛ يُراعى اللباس المحتشم.',
    },
    imageCaption: {
      fa: 'مسجد جامع شافعی',
      en: 'Jameh Mosque of Shafei',
      ar: 'المسجد الجامع الشافعي',
    },
  }),

  // --- HANDICRAFT ---
  defineSite({
    slug: 'giveh-kermanshah',
    category: SiteCategory.HANDICRAFT,
    qrCode: 'GVH-SEED-001',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Kllash_Top-Bottom.jpg',
    coverLabel: 'Giveh',
    title: { fa: 'گیوه کرمانشاه', en: 'Giveh of Kermanshah', ar: 'غيوه كرمانشاه' },
    short: {
      fa: 'کفش دست‌باف کوهستانی؛ سبک، بادوام و سوغات شناخته‌شده.',
      en: 'Handmade mountain footwear. Light, durable, and a classic souvenir.',
      ar: 'حذاء جبلي يدوي. خفيف ومتين وتذكار كلاسيكي.',
    },
    intro: {
      fa: 'گیوه‌بافی از قدیمی‌ترین صنایع دستی غرب ایران است؛ رویه معمولاً با نخ پنبه بافته می‌شود.',
      en: "Giveh weaving is among western Iran's oldest crafts; the upper is usually cotton nalbinding.",
      ar: 'نسج الغيوه من أقدم حرف غرب إيران؛ الجزء العلوي عادة من القطن.',
    },
    section: { fa: 'ویژگی‌ها', en: 'What makes it special', ar: 'ما يميّزه' },
    body: {
      fa: 'مناسب اقلیم خشک کوهستانی است و هنوز در بازار سنتی پیدا می‌شود.',
      en: 'Suited to arid mountain climates and still found in the traditional bazaar.',
      ar: 'مناسبة للمناخ الجبلي الجاف وما زالت تُوجد في السوق التقليدي.',
    },
    imageCaption: { fa: 'نمونه‌ای از گیوه', en: 'A giveh sample', ar: 'نموذج من الغيوه' },
  }),
  defineSite({
    slug: 'kurdish-kilim',
    category: SiteCategory.HANDICRAFT,
    qrCode: 'HND-SEED-002',
    coverUrl:
      'https://upload.wikimedia.org/wikipedia/commons/b/b0/Kurdish_Anatolian_carpet%2C_early_19th_c.jpg',
    coverLabel: 'Kurdish kilim',
    title: { fa: 'گلیم کردی', en: 'Kurdish kilim', ar: 'كيليم كردي' },
    short: {
      fa: 'بافت تخت و نقش‌های هندسی؛ هنر رایج در خانه‌ها و بازار غرب ایران.',
      en: 'Flatweave with geometric motifs. Common in homes and markets of western Iran.',
      ar: 'نسيج مسطح وزخارف هندسية. شائع في البيوت وأسواق غرب إيران.',
    },
    intro: {
      fa: 'گلیم‌های کردی با رنگ‌های گیاهی و نقش‌های تکراری، هم کف‌پوش‌اند و هم دیوارآویز.',
      en: 'Kurdish kilims with vegetal dyes and repeating motifs work as floor covers and wall hangings.',
      ar: 'الكليم الكردي بأصباغ نباتية وزخارف متكررة يصلح كفراش وجدارية.',
    },
    section: { fa: 'خرید آگاهانه', en: 'Buying tips', ar: 'نصائح شراء' },
    body: {
      fa: 'به تراکم بافت، ثبات رنگ و اندازه دقیق توجه کنید؛ فروشندگان بازار سنتی راهنمایی می‌کنند.',
      en: 'Check weave density, colorfastness, and exact size; bazaar sellers can guide you.',
      ar: 'انتبه لكثافة النسج وثبات اللون والقياس؛ باعة السوق يرشدونك.',
    },
    imageCaption: { fa: 'گلیم کردی', en: 'Kurdish kilim', ar: 'كيليم كردي' },
  }),
  defineSite({
    slug: 'persian-carpet',
    category: SiteCategory.HANDICRAFT,
    qrCode: 'HND-SEED-003',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Persian_Carpet.jpg',
    coverLabel: 'Persian carpet',
    title: { fa: 'فرش دستباف', en: 'Handwoven carpet', ar: 'سجادة يدوية' },
    short: {
      fa: 'گره‌بافی نفیس؛ از سوغات‌های ارزشمند قابل حمل در سفر غرب ایران.',
      en: 'Fine knotted weaving. A valued, travel-worthy souvenir from western Iran.',
      ar: 'نسج معقود فاخر. تذكار ثمين يمكن حمله من غرب إيران.',
    },
    intro: {
      fa: 'فروشگاه‌های فرش در کرمانشاه انواع شهری و عشایری را کنار هم عرضه می‌کنند.',
      en: 'Carpet shops in Kermanshah offer both urban and tribal styles side by side.',
      ar: 'محال السجاد في كرمانشاه تعرض الأنماط الحضرية والقبلية معاً.',
    },
    section: { fa: 'قبل خرید', en: 'Before you buy', ar: 'قبل الشراء' },
    body: {
      fa: 'شناسنامه فرش، جنس پرز و پشت‌کار را بپرسید و در نور روز رنگ را ببینید.',
      en: "Ask for the carpet's passport, pile fiber, and backing. And check color in daylight.",
      ar: 'اسأل عن هوية السجادة ونوع الوبر والظهر. وافحص اللون في ضوء النهار.',
    },
    imageCaption: { fa: 'فرش ایرانی', en: 'Persian carpet', ar: 'سجادة فارسية' },
  }),
  defineSite({
    slug: 'bazaar-spices',
    category: SiteCategory.HANDICRAFT,
    qrCode: 'HND-SEED-004',
    coverUrl:
      'https://upload.wikimedia.org/wikipedia/commons/3/3f/Spice_Central_-_Bazaar_-_Kermanshah_-_Western_Iran_%287423419108%29.jpg',
    coverLabel: 'Bazaar spices',
    title: { fa: 'عطاری بازار', en: 'Bazaar spice stalls', ar: 'عطارو السوق' },
    short: {
      fa: 'زعفران، سماق و ادویه‌های محلی در حجره‌های عطاری بازار سنتی.',
      en: "Saffron, sumac, and local spices in the traditional bazaar's herbal stalls.",
      ar: 'الزعفران والسماق والتوابل المحلية في دكاكين العطارة بالسوق.',
    },
    intro: {
      fa: 'عطاری‌های بازار کرمانشاه رنگ و عطر سفر را کامل می‌کنند؛ سوغات سبک و کاربردی.',
      en: 'Bazaar spice shops complete the trip with color and scent. Light, practical souvenirs.',
      ar: 'محال التوابل تكمل الرحلة بلون ورائحة. تذكارات خفيفة وعملية.',
    },
    section: { fa: 'پیشنهاد بسته', en: 'Pack tip', ar: 'نصيحة تعبئة' },
    body: {
      fa: 'ادویه را در بسته‌بندی دربسته بخواهید تا در چمدان پخش نشود.',
      en: "Ask for sealed packs so spices don't spill in your luggage.",
      ar: 'اطلب تعبئة محكمة حتى لا تنسكب التوابل في الحقيبة.',
    },
    imageCaption: {
      fa: 'عطاری بازار کرمانشاه',
      en: 'Spice stalls in Kermanshah bazaar',
      ar: 'عطارو سوق كرمانشاه',
    },
  }),
  defineSite({
    slug: 'bazaar-crafts-lane',
    category: SiteCategory.HANDICRAFT,
    qrCode: 'HND-SEED-005',
    coverUrl:
      'https://upload.wikimedia.org/wikipedia/commons/2/2a/Wigs_Central_-_Bazaar_-_Kermanshah_-_Western_Iran_-_01_%287423422972%29.jpg',
    coverLabel: 'Bazaar crafts lane',
    title: { fa: 'راسته صنایع دستی بازار', en: 'Bazaar crafts lane', ar: 'ممر حرف السوق' },
    short: {
      fa: 'حجره‌های کوچک بازار؛ از کارهای دستی تا اشیای روزمره محلی.',
      en: 'Small bazaar stalls. From handmade pieces to everyday local goods.',
      ar: 'دكاكين صغيرة في السوق. من قطع يدوية إلى سلع يومية محلية.',
    },
    intro: {
      fa: 'قدم زدن در راسته‌های بازار بهترین راه برای دیدن تنوع صنایع کوچک کرمانشاه است.',
      en: "Walking the bazaar lanes is the best way to see Kermanshah's small-craft variety.",
      ar: 'المشي في ممرات السوق أفضل طريقة لرؤية تنوع الحرف الصغيرة في كرمانشاه.',
    },
    section: { fa: 'زمان مناسب', en: 'Best time', ar: 'أفضل وقت' },
    body: {
      fa: 'صبح‌های زود شلوغی کمتر است و نور حجره‌ها برای عکس مناسب‌تر است.',
      en: 'Early mornings are quieter and stall light is better for photos.',
      ar: 'الصباح الباكر أقل ازدحاماً وضوء الدكاكين أنسب للتصوير.',
    },
    imageCaption: {
      fa: 'راسته‌ای در بازار کرمانشاه',
      en: 'A lane in Kermanshah bazaar',
      ar: 'ممر في سوق كرمانشاه',
    },
  }),

  // --- STREET ---
  defineSite({
    slug: 'modarres-street',
    category: SiteCategory.STREET,
    lat: '34.3145000',
    lng: '47.0652000',
    qrCode: 'MDR-SEED-001',
    coverUrl:
      'https://upload.wikimedia.org/wikipedia/commons/0/03/Brickwork_Facade%2C_Modarres_Street%2C_Kermanshah%2C_Iranian_Kurdistan_%282%29.jpg',
    coverLabel: 'Modarres Street',
    title: { fa: 'خیابان مدرس', en: 'Modarres Street', ar: 'شارع مدرس' },
    short: {
      fa: 'محور پرتردد مرکز شهر؛ دسترسی به بازار سنتی و میدان آزادی.',
      en: 'Busy central axis linking the historic bazaar and Azadi Square.',
      ar: 'محور حيوي يربط السوق التقليدي بميدان آزادي.',
    },
    intro: {
      fa: 'خیابان مدرس گردشگر را به بافت تاریخی و ورودی بازار نزدیک می‌کند.',
      en: 'Modarres Street brings visitors close to the historic fabric and bazaar entrance.',
      ar: 'يقرب شارع مدرس الزائر من النسيج التاريخي ومدخل السوق.',
    },
    section: { fa: 'برای گردشگر', en: 'For visitors', ar: 'للزائر' },
    body: {
      fa: 'پیاده‌روی کوتاه، خوراکی‌های محلی و نماهای آجری را در یک مسیر می‌بینید.',
      en: 'A short walk covers local snacks and brick facades in one route.',
      ar: 'مشي قصير يجمع المأكولات المحلية وواجهات الآجر في مسار واحد.',
    },
    imageCaption: {
      fa: 'آجرکاری نما در خیابان مدرس',
      en: 'Brickwork on Modarres Street',
      ar: 'آجر في شارع مدرس',
    },
  }),
  defineSite({
    slug: 'emami-boulevard',
    category: SiteCategory.STREET,
    lat: '34.3210000',
    lng: '47.0780000',
    qrCode: 'STR-SEED-002',
    coverUrl:
      'https://upload.wikimedia.org/wikipedia/commons/e/e5/Emami_Boulevard_%28Kermanshah%29.jpg',
    coverLabel: 'Emami Boulevard',
    title: { fa: 'بلوار امامی', en: 'Emami Boulevard', ar: 'بوليفار إمامي' },
    short: {
      fa: 'محور شهری پهن با فضای سبز و مسیر پیاده.',
      en: 'A wide urban boulevard with greenery and walking space.',
      ar: 'جادة حضرية واسعة مع خضرة ومساحة للمشي.',
    },
    intro: {
      fa: 'بلوار امامی یکی از مسیرهای روزمره شهر برای پیاده‌روی و جابه‌جایی محلی است.',
      en: 'Emami Boulevard is an everyday city route for walking and local travel.',
      ar: 'بوليفار إمامي مسار يومي للمشي والتنقل المحلي.',
    },
    section: { fa: 'حال و هوا', en: 'Atmosphere', ar: 'الأجواء' },
    body: {
      fa: 'عصرها پرترددتر است؛ برای عکس از نمای خیابان، نور طلایی مناسب است.',
      en: 'Evenings are busier; golden-hour light suits street photos.',
      ar: 'المساء أكثر ازدحاماً؛ ضوء العصر يناسب صور الشارع.',
    },
    imageCaption: { fa: 'بلوار امامی', en: 'Emami Boulevard', ar: 'بوليفار إمامي' },
  }),
  defineSite({
    slug: 'traditional-facade-street',
    category: SiteCategory.STREET,
    lat: '34.3158000',
    lng: '47.0672000',
    qrCode: 'STR-SEED-003',
    coverUrl:
      'https://upload.wikimedia.org/wikipedia/commons/a/a7/Street_Scene_with_Traditional_Facade_-_Kermanshah_-_Western_Iran_%287423415568%29.jpg',
    coverLabel: 'Traditional facade street',
    title: {
      fa: 'کوچه نمای سنتی',
      en: 'Traditional facade street',
      ar: 'شارع بواجهة تقليدية',
    },
    short: {
      fa: 'منظر شهری با نماهای سنتی در بافت نزدیک بازار.',
      en: 'Urban scene with traditional facades near the bazaar fabric.',
      ar: 'مشهد حضري بواجهات تقليدية قرب نسيج السوق.',
    },
    intro: {
      fa: 'این محور حس قدیم شهر را با زندگی روزمره امروز کنار هم نگه داشته است.',
      en: 'This street keeps the old-city feel beside everyday life.',
      ar: 'يحافظ هذا الشارع على إحساس المدينة القديمة بجانب الحياة اليومية.',
    },
    section: { fa: 'عکاسی شهری', en: 'Street photography', ar: 'تصوير الشارع' },
    body: {
      fa: 'جزئیات آجر، درها و سایه روشن دیوارها سوژه خوبی برای عکس مستند است.',
      en: 'Brick detail, doors, and wall light/shadow make strong documentary frames.',
      ar: 'تفاصيل الآجر والأبواب وظلال الجدران إطارات وثائقية قوية.',
    },
    imageCaption: {
      fa: 'نمای سنتی در کرمانشاه',
      en: 'Traditional facade in Kermanshah',
      ar: 'واجهة تقليدية في كرمانشاه',
    },
  }),
  defineSite({
    slug: 'kargar-crossroads',
    category: SiteCategory.STREET,
    lat: '34.3195000',
    lng: '47.0825000',
    qrCode: 'STR-SEED-004',
    coverUrl:
      'https://upload.wikimedia.org/wikipedia/commons/3/32/Kargar_Crossroads_%28Kermanshah%29.jpg',
    coverLabel: 'Kargar Crossroads',
    title: { fa: 'چهارراه کارگر', en: 'Kargar Crossroads', ar: 'تقاطع كاركر' },
    short: {
      fa: 'گره ترافیکی آشنای شهر؛ نقطه جهت‌یابی محلی.',
      en: 'A familiar city junction. A local orientation landmark.',
      ar: 'تقاطع مألوف في المدينة. علامة توجيه محلية.',
    },
    intro: {
      fa: 'چهارراه کارگر برای ساکنان نقطه مرجع است و مسیرهای محلی را به هم وصل می‌کند.',
      en: 'Kargar Crossroads is a reference point for residents and ties local routes together.',
      ar: 'تقاطع كاركر نقطة مرجعية للسكان ويربط المسارات المحلية.',
    },
    section: { fa: 'نکته', en: 'Note', ar: 'ملاحظة' },
    body: {
      fa: 'در ساعات اوج شلوغ است؛ برای پیاده‌روی، پیاده‌روهای اطراف را انتخاب کنید.',
      en: 'Busy at peak hours; use nearby sidewalks if you are on foot.',
      ar: 'مزدحم في ساعات الذروة؛ استخدم الأرصفة المجاورة إن كنت راجلاً.',
    },
    imageCaption: { fa: 'چهارراه کارگر', en: 'Kargar Crossroads', ar: 'تقاطع كاركر' },
  }),
  defineSite({
    slug: 'bazaar-approach',
    category: SiteCategory.STREET,
    lat: '34.3162000',
    lng: '47.0695000',
    qrCode: 'STR-SEED-005',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/21/Kermanshah_Bazaar2022-03-07.jpg',
    coverLabel: 'Bazaar approach',
    title: { fa: 'ورودی بازار سنتی', en: 'Historic bazaar approach', ar: 'مدخل السوق التقليدي' },
    short: {
      fa: 'مسیر رسیدن به بازار مسقف؛ شروع تجربه خرید سنتی.',
      en: 'The approach to the covered bazaar. Start of the traditional shopping experience.',
      ar: 'طريق الوصول إلى السوق المسقوف. بداية تجربة التسوق التقليدي.',
    },
    intro: {
      fa: 'از این محور وارد سقف‌های آجری و حجره‌های بههم‌پیوسته بازار می‌شوید.',
      en: 'From here you enter the brick vaults and linked stalls of the bazaar.',
      ar: 'من هنا تدخل أقبية الآجر والدكاكين المترابطة في السوق.',
    },
    section: { fa: 'پیشنهاد مسیر', en: 'Suggested route', ar: 'مسار مقترح' },
    body: {
      fa: 'خیابان مدرس را با ورودی بازار ترکیب کنید تا بافت تاریخی را یکجا ببینید.',
      en: 'Combine Modarres Street with the bazaar entrance to see the historic fabric in one walk.',
      ar: 'اجمع شارع مدرس مع مدخل السوق لترى النسيج التاريخي في مشي واحد.',
    },
    imageCaption: {
      fa: 'بازار کرمانشاه',
      en: 'Kermanshah bazaar',
      ar: 'سوق كرمانشاه',
    },
  }),

  // --- LANDMARK ---
  defineSite({
    slug: 'park-koohestan',
    category: SiteCategory.LANDMARK,
    lat: '34.3928000',
    lng: '47.1285000',
    qrCode: 'PKH-SEED-001',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Taq_e_Bostan_3.jpg',
    coverLabel: 'Park Koohestan area',
    title: { fa: 'پارک کوهستان', en: 'Park Koohestan', ar: 'حديقة كوهستان' },
    short: {
      fa: 'تفرجگاه دامنه طاق بستان؛ چشم‌انداز شهر و پیاده‌روی.',
      en: 'Recreation on the Taq-e Bostan slopes. City views and walks.',
      ar: 'منتزه على سفوح طاق بستان. إطلالات ومشي.',
    },
    intro: {
      fa: 'پارک کوهستان فضای سبز و ورزشی را با بازدید تاریخی طاق بستان نزدیک کرده است.',
      en: 'Park Koohestan pairs green and sports space with a visit to Taq-e Bostan.',
      ar: 'تقرب حديقة كوهستان المساحات الخضراء والرياضية من زيارة طاق بستان.',
    },
    section: { fa: 'چرا بروید؟', en: 'Why go', ar: 'لماذا تذهب؟' },
    body: {
      fa: 'عصرگاهی برای پیاده‌روی و تماشای شهر از ارتفاع مناسب است.',
      en: 'Ideal for an evening walk and elevated city views.',
      ar: 'مناسبة للمشي المسائي ومشاهدة المدينة من الأعلى.',
    },
    imageCaption: {
      fa: 'دامنه طاق بستان و فضای تفرج',
      en: 'Taq-e Bostan slopes and recreation area',
      ar: 'سفوح طاق بستان ومنطقة الترفيه',
    },
  }),
  defineSite({
    slug: 'azadegan-square',
    category: SiteCategory.LANDMARK,
    lat: '34.3270000',
    lng: '47.0750000',
    qrCode: 'LND-SEED-002',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Kermanshah_20190214_02.jpg',
    coverLabel: 'Azadegan Square',
    title: { fa: 'میدان آزادگان', en: 'Azadegan Square', ar: 'ميدان آزادكان' },
    short: {
      fa: 'میدان شهری باز؛ نقطه تجمع و جهت‌یابی در شهر.',
      en: 'An open urban square. A gathering and orientation point.',
      ar: 'ميدان حضري مفتوح. نقطة تجمع وتوجيه.',
    },
    intro: {
      fa: 'میدان آزادگان فضای باز شهری برای گذر، عکس و شروع پیاده‌روی در مرکز است.',
      en: 'Azadegan Square is open urban space for passing through, photos, and starting a walk downtown.',
      ar: 'ميدان آزادكان مساحة حضرية مفتوحة للعبور والصور وبدء مشي في الوسط.',
    },
    section: { fa: 'دسترسی', en: 'Access', ar: 'الوصول' },
    body: {
      fa: 'با تاکسی یا اتوبوس‌های شهری به‌راحتی می‌رسید؛ اطراف میدان خدمات روزمره دارد.',
      en: 'Easy by taxi or city bus; everyday services surround the square.',
      ar: 'سهل الوصول بتاكسي أو باص؛ خدمات يومية حول الميدان.',
    },
    imageCaption: { fa: 'میدان آزادگان', en: 'Azadegan Square', ar: 'ميدان آزادكان' },
  }),
  defineSite({
    slug: 'shohada-square',
    category: SiteCategory.LANDMARK,
    lat: '34.3225000',
    lng: '47.0708000',
    qrCode: 'LND-SEED-003',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Kermanshah_Photos_M2.jpg',
    coverLabel: 'Shohada Square',
    title: { fa: 'میدان شهدا', en: 'Shohada Square', ar: 'ميدان الشهداء' },
    short: {
      fa: 'میدان مرکزی آشنا برای ساکنان؛ گره حرکت شهری.',
      en: 'A familiar central square for residents. An urban movement hub.',
      ar: 'ميدان مركزي مألوف للسكان. محور حركة حضرية.',
    },
    intro: {
      fa: 'میدان شهدا بخشی از حافظه جمعی شهر و نقطه شروع بسیاری از مسیرهای محلی است.',
      en: "Shohada Square is part of the city's shared memory and a start point for many local routes.",
      ar: 'ميدان الشهداء جزء من ذاكرة المدينة ونقطة انطلاق لمسارات محلية كثيرة.',
    },
    section: { fa: 'اطراف', en: 'Around', ar: 'حوله' },
    body: {
      fa: 'فروشگاه‌ها و مسیرهای پیاده اطراف میدان را برای یک دور کوتاه شهری ترکیب کنید.',
      en: 'Combine nearby shops and sidewalks for a short urban loop.',
      ar: 'اجمع المتاجر والأرصفة المجاورة لجولة حضرية قصيرة.',
    },
    imageCaption: { fa: 'میدان شهدا', en: 'Shohada Square', ar: 'ميدان الشهداء' },
  }),
  defineSite({
    slug: 'fath-ali-shah-relief',
    category: SiteCategory.LANDMARK,
    lat: '34.3865000',
    lng: '47.1325000',
    qrCode: 'LND-SEED-004',
    coverUrl:
      'https://upload.wikimedia.org/wikipedia/commons/3/35/FathAli_shah-taqe_bostan-Photos_from_Sahand_Ace.jpg',
    coverLabel: 'Fath-Ali Shah relief area',
    title: {
      fa: 'محوطه نقش فتحعلی‌شاه',
      en: 'Fath-Ali Shah relief area',
      ar: 'منطقة نقش فتح علي شاه',
    },
    short: {
      fa: 'نقطه شاخص کنار مجموعه طاق بستان؛ ترکیب تاریخ و تفرج.',
      en: 'A landmark spot by Taq-e Bostan. History paired with recreation.',
      ar: 'نقطة بارزة بجوار طاق بستان. تاريخ مع ترفيه.',
    },
    intro: {
      fa: 'این محوطه کنار مجموعه اصلی، برای توقف کوتاه و عکس در مسیر بازدید طاق بستان مناسب است.',
      en: 'Beside the main complex, this area suits a short stop and photos on a Taq-e Bostan visit.',
      ar: 'بجانب المجمع الرئيسي تناسب هذه المنطقة توقفاً قصيراً وصوراً في زيارة طاق بستان.',
    },
    section: { fa: 'ترکیب بازدید', en: 'Combine the visit', ar: 'ادمج الزيارة' },
    body: {
      fa: 'با پارک کوهستان و ایوان اصلی در یک نیم‌روز قابل جمع است.',
      en: 'Fits with Park Koohestan and the main iwan in a half-day.',
      ar: 'يمكن جمعه مع حديقة كوهستان والإيوان الرئيسي في نصف يوم.',
    },
    imageCaption: {
      fa: 'محوطه طاق بستان',
      en: 'Taq-e Bostan grounds',
      ar: 'أراضي طاق بستان',
    },
  }),
  defineSite({
    slug: 'masjed-jameh-landmark',
    category: SiteCategory.LANDMARK,
    lat: '34.3175000',
    lng: '47.0702000',
    qrCode: 'LND-SEED-005',
    coverUrl:
      'https://upload.wikimedia.org/wikipedia/commons/7/77/Masjed-e_Jameh%2C_Kermanshah%2C_Iran_%285071666027%29.jpg',
    coverLabel: 'Masjed-e Jameh',
    title: { fa: 'مسجد جامع کرمانشاه', en: 'Masjed-e Jameh', ar: 'المسجد الجامع' },
    short: {
      fa: 'نشان شهری در بافت مرکزی؛ نقطه جهت‌یابی و عکس.',
      en: 'A central urban marker. Orientation point and photo stop.',
      ar: 'علامة حضرية مركزية. نقطة توجيه وتوقف للتصوير.',
    },
    intro: {
      fa: 'گنبد و سردر مسجد جامع از دور در مرکز شهر خوانا است و مسیر بازار را نشان می‌دهد.',
      en: 'The dome and portal of the Jameh mosque read clearly downtown and point toward the bazaar.',
      ar: 'قبة ومدخل المسجد الجامع واضحان في الوسط ويشيران نحو السوق.',
    },
    section: { fa: 'در مسیر', en: 'On the way', ar: 'في الطريق' },
    body: {
      fa: 'می‌توانید بازدید بیرونی را با پیاده‌روی بازار و خیابان مدرس ترکیب کنید.',
      en: 'Pair an exterior look with a bazaar and Modarres Street walk.',
      ar: 'اجمع نظرة خارجية مع مشي في السوق وشارع مدرس.',
    },
    imageCaption: {
      fa: 'مسجد جامع کرمانشاه',
      en: 'Masjed-e Jameh, Kermanshah',
      ar: 'المسجد الجامع في كرمانشاه',
    },
  }),

  // --- FOOD ---
  defineSite({
    slug: 'dandeh-kebab',
    category: SiteCategory.FOOD,
    qrCode: 'DKB-SEED-001',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Kebab_Bakhtyari.jpg',
    coverLabel: 'Dandeh kebab style',
    title: { fa: 'دنده کباب', en: 'Dandeh kebab', ar: 'دنده كباب' },
    short: {
      fa: 'خوراک اصیل کرمانشاه از دنده گوسفند؛ نماد شهر خلاق خوراک.',
      en: 'Classic Kermanshah lamb-rib dish. A Creative City of Gastronomy symbol.',
      ar: 'طبق كرمانشاهي من أضلاع الخروف. رمز مدينة الطهي المبدعة.',
    },
    intro: {
      fa: 'دنده کباب با سس غلیظ و پخت آرام روی زغال شناخته می‌شود.',
      en: 'Dandeh kebab is known for a thick glaze and slow charcoal cooking.',
      ar: 'يشتهر دنده كباب بصلصة كثيفة وطهي بطيء على الفحم.',
    },
    section: { fa: 'مراحل ساده', en: 'Simple steps', ar: 'خطوات بسيطة' },
    body: {
      fa: 'نسخه خانگی ساده‌شده؛ فهرست رستوران‌ها بعداً اضافه می‌شود.',
      en: 'A simplified home-style outline; a restaurant directory comes later.',
      ar: 'خطة منزلية مبسطة؛ قائمة المطاعم لاحقاً.',
    },
    listItems: {
      fa: [
        'دنده را پهن کنید و با سیخ محکم کنید.',
        'گوشت را نرم کنید و چند ساعت استراحت دهید.',
        'سس رب، روغن، نمک، فلفل، آبلیمو و زعفران را آماده کنید.',
        'روی زغال متوسط کباب کنید و سس بزنید.',
        'با نان، پیاز و لیمو سرو کنید.',
      ],
      en: [
        'Flatten the ribs and secure with skewers.',
        'Tenderize and rest for a few hours.',
        'Make a tomato-oil-saffron glaze.',
        'Grill over medium charcoal, basting often.',
        'Serve with bread, onion, and lemon.',
      ],
      ar: [
        'افرد الأضلاع وثبّتها بأسياخ.',
        'طرِّ اللحم واتركه ساعات.',
        'حضّر صلصة رب وزيت وزعفران.',
        'اشوِ على فحم متوسط مع دهن الصلصة.',
        'قدّم مع الخبز والبصل والليمون.',
      ],
    },
    imageCaption: { fa: 'کباب ایرانی', en: 'Iranian kebab', ar: 'كباب إيراني' },
  }),
  defineSite({
    slug: 'chelow-kebab',
    category: SiteCategory.FOOD,
    qrCode: 'FOD-SEED-002',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Kabab_1.jpg',
    coverLabel: 'Chelow kebab',
    title: { fa: 'چلوکباب', en: 'Chelow kebab', ar: 'تشلو كباب' },
    short: {
      fa: 'برنج ایرانی با کباب؛ ترکیب کلاسیک سفره.',
      en: 'Persian rice with kebab. A classic table pairing.',
      ar: 'أرز فارسي مع كباب. ثنائي كلاسيكي على المائدة.',
    },
    intro: {
      fa: 'چلوکباب در رستوران‌های کرمانشاه با برنج دم‌کشیده و کره زعفرانی سرو می‌شود.',
      en: 'In Kermanshah restaurants, chelow kebab comes with steamed rice and saffron butter.',
      ar: 'في مطاعم كرمانشاه يُقدَّم تشلو كباب مع أرز مطهو وزبدة زعفران.',
    },
    section: { fa: 'همراهی‌ها', en: 'Sides', ar: 'المرافقات' },
    body: {
      fa: 'گوجه کبابی، سبزی، دوغ و پیاز تازه همراه همیشگی میز هستند.',
      en: 'Grilled tomato, herbs, doogh, and fresh onion are usual companions.',
      ar: 'طماطم مشوية وأعشاب ودوغ وبصل طازج مرافقات معتادة.',
    },
    imageCaption: { fa: 'چلوکباب', en: 'Chelow kebab', ar: 'تشلو كباب' },
  }),
  defineSite({
    slug: 'jujeh-kebab',
    category: SiteCategory.FOOD,
    qrCode: 'FOD-SEED-003',
    // Prefer a known-good Commons JPEG (some jujeh files trip Sharp / rate limits).
    coverUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Kabab_1.jpg',
    coverLabel: 'Jujeh kebab',
    title: { fa: 'جوجه‌کباب', en: 'Jujeh kebab', ar: 'جوجه كباب' },
    short: {
      fa: 'مرغ زعفرانی سیخی؛ سبک‌تر از دنده و محبوب خانواده.',
      en: 'Saffron chicken skewers. Lighter than ribs and family-friendly.',
      ar: 'أسياخ دجاج بالزعفران. أخف من الأضلاع ومناسبة للعائلة.',
    },
    intro: {
      fa: 'جوجه‌کباب با زعفران و آبلیمو مزه می‌گیرد و روی زغال طلایی می‌شود.',
      en: 'Jujeh kebab is marinated with saffron and lemon, then grilled golden over charcoal.',
      ar: 'يُتبّل جوجه كباب بالزعفران والليمون ثم يُشوى ذهبياً على الفحم.',
    },
    section: { fa: 'سرو', en: 'Serving', ar: 'التقديم' },
    body: {
      fa: 'با سنگک تازه، کره و سبزی خوردن کامل می‌شود.',
      en: 'Best with fresh sangak, butter, and fresh herbs.',
      ar: 'يكتمل مع خبز سنغك طازج وزبدة وأعشاب.',
    },
    imageCaption: { fa: 'جوجه‌کباب', en: 'Jujeh kebab', ar: 'جوجه كباب' },
  }),
  defineSite({
    slug: 'nan-sangak',
    category: SiteCategory.FOOD,
    qrCode: 'FOD-SEED-004',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Naan_Sangak.jpg',
    coverLabel: 'Sangak bread',
    title: { fa: 'نان سنگک', en: 'Sangak bread', ar: 'خبز سنغك' },
    short: {
      fa: 'نان سنگک تنوری؛ پایه بسیاری از صبحانه‌ها و کباب‌ها.',
      en: 'Stone-baked sangak. Base for many breakfasts and kebabs.',
      ar: 'سنغك مخبوز على الحصى. أساس لكثير من الإفطار والكباب.',
    },
    intro: {
      fa: 'سنگک داغ از تنور سنگ‌ریزه‌ای، بافتی متخلخل و عطری متمایز دارد.',
      en: 'Hot sangak from a pebble oven has an open crumb and a distinctive aroma.',
      ar: 'سنغك ساخن من فرن الحصى بقوام مفتوح ورائحة مميزة.',
    },
    section: { fa: 'کجا بخرید', en: 'Where to buy', ar: 'أين تشتري' },
    body: {
      fa: 'نانوایی‌های سنتی شهر صبح زود شلوغ‌اند؛ سنگک تازه را همان روز بخورید.',
      en: 'Traditional bakeries are busy early; eat sangak the same day.',
      ar: 'المخابز التقليدية مزدحمة باكراً؛ كل السنغك في يومه.',
    },
    imageCaption: { fa: 'نان سنگک', en: 'Sangak bread', ar: 'خبز سنغك' },
  }),
  defineSite({
    slug: 'ash-reshteh',
    category: SiteCategory.FOOD,
    qrCode: 'FOD-SEED-005',
    coverUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/54/Ash_Reshteh.JPG',
    coverLabel: 'Ash reshteh',
    title: { fa: 'آش رشته', en: 'Ash reshteh', ar: 'آش رشته' },
    short: {
      fa: 'آش غلیظ با رشته و حبوبات؛ خوراک گرم و مهمانی‌پسند.',
      en: 'A thick noodle-and-legume soup. Warm and gathering-friendly.',
      ar: 'حساء كثيف بالشعيرية والبقول. دافئ ومناسب للقاءات.',
    },
    intro: {
      fa: 'آش رشته با نعناع داغ، کشک و پیاز سرخ‌شده تزئین می‌شود و در فصل سرد پرطرفدار است.',
      en: 'Ash reshteh is finished with hot mint oil, kashk, and fried onion. Popular in cold months.',
      ar: 'يُزيَّن آش رشته بزيت النعناع والكشك والبصل المقلي. محبوب في الأشهر الباردة.',
    },
    section: { fa: 'سرو محلی', en: 'Local serve', ar: 'تقديم محلي' },
    body: {
      fa: 'در مهمانی‌ها و ایستگاه‌های خوراک محلی به‌صورت ککاسه سرو می‌شود.',
      en: 'Served by the bowl at gatherings and local food stops.',
      ar: 'يُقدَّم في أوعية في التجمعات ومحطات الطعام المحلية.',
    },
    imageCaption: { fa: 'آش رشته', en: 'Ash reshteh', ar: 'آش رشته' },
  }),
];
