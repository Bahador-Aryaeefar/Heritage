import { BlockAlign, ColorToken, ContentBlockType, TextRole } from '@prisma/client';

type TextSpan = { text: string; bold?: boolean; italic?: boolean };

type TextBlockSeed = {
  sortOrder: number;
  type: typeof ContentBlockType.HEADING | typeof ContentBlockType.PARAGRAPH;
  textRole: TextRole;
  colorToken: ColorToken;
  align: BlockAlign;
  spans: TextSpan[];
};

type MediaBlockSeed = {
  sortOrder: number;
  type: typeof ContentBlockType.IMAGE | typeof ContentBlockType.AUDIO | typeof ContentBlockType.VIDEO;
  mediaId: string;
  caption: string | null;
};

export type SeedBlock = TextBlockSeed | MediaBlockSeed;

type SiteMediaIds = {
  coverMediaId: string;
  treeMediaId: string;
  ivanMediaId: string;
  audioMediaId: string;
  videoMediaId: string;
};

const body = ColorToken.BROWN_800;
const heading = ColorToken.BROWN_950;
const accent = ColorToken.TEAL_700;

export function buildFaBlocks(media: SiteMediaIds): SeedBlock[] {
  return [
    {
      sortOrder: 0,
      type: ContentBlockType.HEADING,
      textRole: TextRole.HERO,
      colorToken: ColorToken.BROWN_800,
      align: BlockAlign.CENTER,
      spans: [{ text: 'طاق بستان' }],
    },
    {
      sortOrder: 1,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'طاق بستان در شمال غرب کرمانشاه، یکی از درخشان‌ترین مجموعه‌های سنگ‌نگاره ساسانی است. دو ایوان سنگی در دل کوهستان زاگرس حک شده‌اند: ایوانی کوچک‌تر با نقش‌های شکار و درخت زندگی، و ایوان بزرگ با صحنه تاج‌گذاری خسرو پرویز، شکار گراز و شیر ایستاده. حوض‌های سنگی و چشمه‌هایی که از دل صخره می‌جوشند، این اثر را از هزاران سال پیش زیستگاهی مقدس و نمایشگاه قدرت شاهانه ساخته‌اند.',
        },
      ],
    },
    {
      sortOrder: 2,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: heading,
      align: BlockAlign.START,
      spans: [{ text: 'جایگاه در کوهستان زاگرس' }],
    },
    {
      sortOrder: 3,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'این مجموعه حدود پنج کیلومتر شمال شرقی مرکز کرمانشاه، در دامنه کوه‌های زاگرس قرار دارد. طاق بستان یکی از سی مجموعه سنگ‌نگاره ساسانی است که در رشته کوه زاگرس باقی مانده است. موقعیت آن در کنار راه‌های قدیمی عبور و نزدیکی به جاده ابریشم، باعث شد شاهان ساسانی این صخره را برای نمایش شکوه درباری و آیین‌های مذهبی برگزینند.',
        },
      ],
    },
    {
      sortOrder: 4,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'چشمه‌های طبیعی که از کنار و زیر نقش‌ها بیرون می‌آیند، امروز هم به حوض سنگی جلوی ایوان بزرگ آب می‌رسانند. این آب‌های زلال در باورهای باستانی، ارتباط میان زمین و ایزدان را نماد می‌کردند و احتمالاً نقش مهمی در مراسم تاج‌گذاری و نیایش داشتند.',
        },
      ],
    },
    {
      sortOrder: 5,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: heading,
      align: BlockAlign.START,
      spans: [{ text: 'تاریخ و شاهان ساسانی' }],
    },
    {
      sortOrder: 6,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        { text: 'سنگ‌نگاره‌های طاق بستان عمدتاً به ' },
        { text: 'دوران ساسانی', bold: true },
        { text: ' (حدود ۲۲۴ تا ۶۵۱ میلادی) برمی‌گردند. قدیمی‌ترین نقش، صحنه تاج‌گذاری ' },
        { text: 'اردشیر دوم', italic: true },
        { text: ' (۳۷۹ تا ۳۸۳) است که در بیرون ایوان کوچک دیده می‌شود. او از ایزدان ' },
        { text: 'مهر', italic: true },
        { text: ' و ' },
        { text: 'آناهیتا', italic: true },
        { text: ' تاج می‌گیرد و در کنارش شکل ژولیانوس امپراتور روم به زمین افتاده، یادآور پیروزی ساسانیان بر بیزانس است.',
        },
      ],
    },
    {
      sortOrder: 7,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        { text: 'ایوان بزرگ عمدتاً به ' },
        { text: 'خسرو پرویز', italic: true },
        { text: ' (۵۹۰ تا ۶۲۸) نسبت داده می‌شود، شاهی که در اوج قدرت ساسانیان، لشکرکشی‌های گسترده‌ای به سوریه، مصر و حتی نزدیکی قسطنطنیه انجام داد. سنگ‌نگاره‌های این ایوان احتمالاً برای جشن پیروزی‌های نظامی و نمایش مشروعیت شاهانه تراشیده شدند.',
        },
      ],
    },
    {
      sortOrder: 8,
      type: ContentBlockType.IMAGE,
      mediaId: media.coverMediaId,
      caption: 'نمای ایوان اصلی طاق بستان و حوض سنگی',
    },
    {
      sortOrder: 9,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: heading,
      align: BlockAlign.START,
      spans: [{ text: 'ایوان کوچک' }],
    },
    {
      sortOrder: 10,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'ایوان کوچک‌تر، با طاق نیم‌گردی که در دل صخره تراشیده شده، نقش‌های شکار شاه و درخت زندگی را در خود جای داده است. درخت زندگی، نماد جاودانگی و فراوانی در هنر ایران باستان است و در اینجا با جزئیات ظریف بر سنگ حک شده است. صحنه شکار، قدرت شاه را بر طبیعت و حیوانات وحشی نشان می‌دهد.',
        },
      ],
    },
    {
      sortOrder: 11,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'نور طبیعی از دهانه ایوان به داخل می‌تابد و عمق برجسته‌ها را برجسته می‌کند. استادان ساسانی با تسلط بر فرم انسانی، پارچه، تاج و اسب، روایتی زنده از دربار شاهنشاهی را در سنگ ثبت کرده‌اند.',
        },
      ],
    },
    {
      sortOrder: 12,
      type: ContentBlockType.IMAGE,
      mediaId: media.treeMediaId,
      caption: 'سنگ‌نگاره درخت زندگی در ایوان کوچک',
    },
    {
      sortOrder: 13,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: heading,
      align: BlockAlign.START,
      spans: [{ text: 'ایوان بزرگ و تاج‌گذاری خسرو پرویز' }],
    },
    {
      sortOrder: 14,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'ایوان بزرگ با دهانه‌ای حدود نه متر ارتفاع، باشکوه‌ترین بخش طاق بستان است. در بالای دیوار پشتی، سه شخصیت ایستاده دیده می‌شوند: خسرو پرویز در میانه، و در دو طرف احتمالاً اهورا مزدا و آناهیتا. شاه شمشیر تزئینی را در دست چپ دارد و از ایزدان نماد فر (farr) سلطنت را می‌گیرد.',
        },
      ],
    },
    {
      sortOrder: 15,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'در بخش پایین‌تر، مجسمه سه‌بعدی شاهنشاه سوار بر اسب مشهورش «شبدیز» قرار دارد. این نقش، جزئیات بی‌نظیری از زره اسب (برگستوان)، کلاهخود با شکاف دید، و لباس نظامی ساسانی را نشان می‌دهد و برای پژوهشگران تاریخ نظامی بسیار ارزشمند است.',
        },
      ],
    },
    {
      sortOrder: 16,
      type: ContentBlockType.IMAGE,
      mediaId: media.ivanMediaId,
      caption: 'ایوان بزرگ و حوض سنگی مقابل آن',
    },
    {
      sortOrder: 17,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: heading,
      align: BlockAlign.START,
      spans: [{ text: 'صحنه‌های شکار' }],
    },
    {
      sortOrder: 18,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'در دو طرف ایوان بزرگ، نقش‌های شکار گراز و فیل دیده می‌شود. شاه روی قایق ایستاده و با کمان جناغی به گرازهای وحشی نشانه می‌رود. شکارچیان دیگر از پشت فیل‌ها نیز در صحنه حضور دارند. این ترکیب، الهام‌های هنری از هند و سنت شکار شاهانه ایرانی را در هم می‌آمیزد.',
        },
      ],
    },
    {
      sortOrder: 19,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'شیر ایستاده در کنار ایوان، یکی از نمادین‌ترین عناصر طاق بستان است. این شیر، قدرت شاهنشاهی و شجاعت ساسانیان را تجسم می‌کند و جزئیات عضلات و یال آن، نشان از مهارت بی‌نظیر سنگتراشان دارد.',
        },
      ],
    },
    {
      sortOrder: 20,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: heading,
      align: BlockAlign.START,
      spans: [{ text: 'نمادها و باورهای زرتشتی' }],
    },
    {
      sortOrder: 21,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'بسیاری از نقش‌ها ریشه در باورهای زرتشتی دارند: اهورا مزدا به عنوان خالق، آناهita ایزدبانوی آب و باروری، و مهر ایزد پیمان و نور. تاج‌گذاری شاه توسط ایزدان، legitimacy حکومت را توجیه می‌کرد. درخت زندگی، شیر، و صحنه‌های شکار هر کدام نمادهایی از نظم کیهانی (آشا) و پیروزی نور بر تاریکی بودند.',
        },
      ],
    },
    {
      sortOrder: 22,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: heading,
      align: BlockAlign.START,
      spans: [{ text: 'هنر و فناوری سنگتراشی' }],
    },
    {
      sortOrder: 23,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'هنرمندان ساسانی سنگ را نه فقط می‌تراشیدند، بلکه لایه‌های مختلف عمق را برای ایجاد سایه و حجم به کار می‌بردند. لباس‌های آجری، تاج‌های جواهرنشان، گردنبندهای مروارید، و ریش‌های فرفری شاهان، همگی با دقت واقع‌گرایانه حک شده‌اند. آرتور پوپ، پژوهشگر هنر ایران، طاق بستان را نمونه‌ای از «هدیه هنر ایرانی به جهان» خوانده است.',
        },
      ],
    },
    {
      sortOrder: 24,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: heading,
      align: BlockAlign.START,
      spans: [{ text: 'حفظ و میراث جهانی' }],
    },
    {
      sortOrder: 25,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'طاق بستان پس از نزدیک به ۱۷۰۰ سال، در برابر باد، باران و فرسایش طبیعی دوام آورده است. امروز به عنوان پارک باستان‌شناسی اداره می‌شود و سرستون‌های ساسانی و اسلامی از مناطق مختلف در کنار آن گردآوری شده‌اند. این اثر در فهرست میراث جهانی یونesco (فهرست موقت) قرار دارد و همراه با بیستون، یکی از مهم‌ترین جاذبه‌های تاریخی استان کرمانشاه است.',
        },
      ],
    },
    {
      sortOrder: 26,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: accent,
      align: BlockAlign.START,
      spans: [{ text: 'بازدید امروز' }],
    },
    {
      sortOrder: 27,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: ColorToken.BROWN_950,
      align: BlockAlign.START,
      spans: [
        {
          text: 'امروزه طاق بستان یکی از پربازدیدترین اماکن تاریخی غرب ایران است. با اسکن QR کنار اثر، همین روایت را به فارسی یا انگلیسی بخوانید و به روایت صوتی کوتاه گوش دهید. برای حفظ سنگ‌نگاره‌ها از لمس مستقیم آن‌ها خودداری کنید و از مسیرهای مشخص‌شده بازدید نمایید.',
        },
      ],
    },
    {
      sortOrder: 28,
      type: ContentBlockType.AUDIO,
      mediaId: media.audioMediaId,
      caption: 'روایت صوتی کوتاه (نمونه)',
    },
    {
      sortOrder: 29,
      type: ContentBlockType.VIDEO,
      mediaId: media.videoMediaId,
      caption: 'فیلم معرفی طاق بستان',
    },
    {
      sortOrder: 30,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.CAPTION,
      colorToken: body,
      align: BlockAlign.CENTER,
      spans: [
        {
          text: 'منبع تصاویر: وikimedia Commons. متن بر پایه منابع تاریخی عمومی و پژوهش‌های باستان‌شناسی تنظیم شده است.',
        },
      ],
    },
  ];
}

export function buildEnBlocks(media: SiteMediaIds): SeedBlock[] {
  return [
    {
      sortOrder: 0,
      type: ContentBlockType.HEADING,
      textRole: TextRole.HERO,
      colorToken: ColorToken.BROWN_800,
      align: BlockAlign.CENTER,
      spans: [{ text: 'Taq-e Bostan' }],
    },
    {
      sortOrder: 1,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'Northwest of Kermanshah, Taq-e Bostan is one of the finest surviving Sasanian rock-relief complexes. Two stone iwans are carved into the Zagros Mountains: a smaller ivan with royal hunt scenes and the tree of life, and a larger ivan with the investiture of Khosrow II, boar hunts, and the famous standing lion. Stone pools and natural springs have made this site a sacred landscape and a stage for royal power for nearly two millennia.',
        },
      ],
    },
    {
      sortOrder: 2,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: heading,
      align: BlockAlign.START,
      spans: [{ text: 'Setting in the Zagros' }],
    },
    {
      sortOrder: 3,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'The site lies about five kilometres northeast of central Kermanshah, on the slopes of the Zagros range. Taq-e Bostan is one of thirty known Sasanian relief groups along these mountains. Its position beside ancient travel routes, including connections to the Silk Road, made the cliff an ideal canvas for court ceremony and royal propaganda.',
        },
      ],
    },
    {
      sortOrder: 4,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'Natural springs still feed the large stone basin in front of the great ivan. In ancient belief, flowing water linked the earthly and divine realms and likely played a role in coronation and Zoroastrian ritual at the site.',
        },
      ],
    },
    {
      sortOrder: 5,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: heading,
      align: BlockAlign.START,
      spans: [{ text: 'History and Sasanian kings' }],
    },
    {
      sortOrder: 6,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        { text: 'Most reliefs belong to the ' },
        { text: 'Sasanian era', bold: true },
        { text: ' (roughly 224 to 651 CE). The earliest major scene shows the investiture of ' },
        { text: 'Ardashir II', italic: true },
        { text: ' (379 to 383), receiving his crown from the gods ' },
        { text: 'Mithra', italic: true },
        { text: ' and ' },
        { text: 'Anahita', italic: true },
        { text: ', with a fallen figure often interpreted as the Roman emperor Julian the Apostate, commemorating Sasanian victory over Byzantium.',
        },
      ],
    },
    {
      sortOrder: 7,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        { text: 'The great ivan is chiefly associated with ' },
        { text: 'Khosrow II', italic: true },
        { text: ' (590 to 628), who at the height of Sasanian power campaigned across Syria, Egypt, and nearly to Constantinople. The reliefs inside his ivan were likely carved to celebrate military triumph and divine sanction for kingship.',
        },
      ],
    },
    {
      sortOrder: 8,
      type: ContentBlockType.IMAGE,
      mediaId: media.coverMediaId,
      caption: 'Main ivan facade and stone pool',
    },
    {
      sortOrder: 9,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: heading,
      align: BlockAlign.START,
      spans: [{ text: 'The small ivan' }],
    },
    {
      sortOrder: 10,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'The smaller ivan opens with a semicircular arch cut into the living rock. Inside are royal hunt scenes and the tree of life, a symbol of abundance and immortality in ancient Iranian art, rendered with fine detail. Hunt imagery asserts the king\'s mastery over nature and wild beasts.',
        },
      ],
    },
    {
      sortOrder: 11,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'Daylight from the entrance rakes across the reliefs and brings out their depth. Sasanian carvers mastered human form, textiles, crowns, and horses, leaving a vivid record of imperial court life in stone.',
        },
      ],
    },
    {
      sortOrder: 12,
      type: ContentBlockType.IMAGE,
      mediaId: media.treeMediaId,
      caption: 'Tree of life relief in the small ivan',
    },
    {
      sortOrder: 13,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: heading,
      align: BlockAlign.START,
      spans: [{ text: 'The great ivan and Khosrow II' }],
    },
    {
      sortOrder: 14,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'The great ivan rises about nine metres high. On the back wall, three standing figures are usually read as Khosrow II flanked by Ahura Mazda and Anahita. The king holds a ceremonial sword and receives the ribboned ring of kingship, the royal farr, from the god.',
        },
      ],
    },
    {
      sortOrder: 15,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'Below, a remarkable equestrian statue shows Khosrow on his famous horse Shabdiz. It preserves rare details of late Sasanian cavalry armour, horse bardings, helmets with eyebrow slits, and mail, invaluable for military historians.',
        },
      ],
    },
    {
      sortOrder: 16,
      type: ContentBlockType.IMAGE,
      mediaId: media.ivanMediaId,
      caption: 'The large ivan and stone pool',
    },
    {
      sortOrder: 17,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: heading,
      align: BlockAlign.START,
      spans: [{ text: 'Hunting scenes' }],
    },
    {
      sortOrder: 18,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'On either side of the great ivan are panels of royal hunting. Khosrow stands in a boat and shoots wild boar with a recurve bow, while attendants hunt from elephant back, a motif that may reflect Indian artistic influence. Royal hunt scenes glorified the king as protector and master of the natural order.',
        },
      ],
    },
    {
      sortOrder: 19,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'The standing lion beside the ivan is among the most iconic images at Taq-e Bostan. Its musculature and mane demonstrate the extraordinary skill of Sasanian stone carvers and symbolize royal courage and power.',
        },
      ],
    },
    {
      sortOrder: 20,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: heading,
      align: BlockAlign.START,
      spans: [{ text: 'Zoroastrian symbolism' }],
    },
    {
      sortOrder: 21,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'Many scenes draw on Zoroastrian belief: Ahura Mazda as creator, Anahita as goddess of water and fertility, and Mithra as deity of covenant and light. Divine investiture justified royal rule. The tree of life, lion, and hunt each express cosmic order and the triumph of light over chaos.',
        },
      ],
    },
    {
      sortOrder: 22,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: heading,
      align: BlockAlign.START,
      spans: [{ text: 'Art and carving technique' }],
    },
    {
      sortOrder: 23,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'Sasanian artists worked in layered depth to create shadow and volume. Scale armour, jewelled crowns, pearl necklaces, and curled royal beards are rendered with striking realism. The art historian Arthur Pope called Taq-e Bostan a gift of Iranian art to the world.',
        },
      ],
    },
    {
      sortOrder: 24,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: heading,
      align: BlockAlign.START,
      spans: [{ text: 'Preservation and world heritage' }],
    },
    {
      sortOrder: 25,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: body,
      align: BlockAlign.START,
      spans: [
        {
          text: 'After nearly 1,700 years of wind and rain, the reliefs remain remarkably intact. The site is now an archaeological park, with Sasanian and Islamic capitals collected nearby. It appears on UNESCO\'s tentative list, and together with Bisotun forms one of the most important heritage destinations in Kermanshah province.',
        },
      ],
    },
    {
      sortOrder: 26,
      type: ContentBlockType.HEADING,
      textRole: TextRole.H2,
      colorToken: accent,
      align: BlockAlign.START,
      spans: [{ text: 'Visiting today' }],
    },
    {
      sortOrder: 27,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.BODY,
      colorToken: ColorToken.BROWN_950,
      align: BlockAlign.START,
      spans: [
        {
          text: 'Taq-e Bostan is among the most visited heritage sites in western Iran. Scan the QR plaque beside the monument to read this guide in Persian or English and listen to the sample audio narration. Please avoid touching the reliefs and follow marked paths to help preserve the site.',
        },
      ],
    },
    {
      sortOrder: 28,
      type: ContentBlockType.AUDIO,
      mediaId: media.audioMediaId,
      caption: 'Short audio narration (sample)',
    },
    {
      sortOrder: 29,
      type: ContentBlockType.VIDEO,
      mediaId: media.videoMediaId,
      caption: 'Taq-e Bostan introduction video',
    },
    {
      sortOrder: 30,
      type: ContentBlockType.PARAGRAPH,
      textRole: TextRole.CAPTION,
      colorToken: body,
      align: BlockAlign.CENTER,
      spans: [
        {
          text: 'Image sources: Wikimedia Commons. Text adapted from widely published historical and archaeological sources.',
        },
      ],
    },
  ];
}
