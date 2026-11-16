import { matchText, uzLatinToCyrillic } from "./normalize";
import type { Script } from "./language";
import type { Specialty } from "./specialties";
import type { RouterOutput } from "./schemas";
import type { Locale } from "../time";

/**
 * Offline symptom router. Used when the model is unavailable, times out, refuses or returns
 * output that fails validation twice — so booking never breaks — and to phrase the result
 * when the deterministic emergency rule fires.
 *
 * It recognises symptom *concepts* (not single keywords), each with a plain-language label
 * and a weight towards one or two specialists. That lets it say what it understood, explain
 * why that specialist fits, suggest a second option and ask a clarifying question when the
 * text is too vague — all without naming any disease.
 *
 * Rules run on `matchText`, so Uzbek rules also cover Uzbek typed in Cyrillic.
 */

type L3 = Record<Locale, string>;
type Concept = { label: L3; to: Partial<Record<Specialty, number>>; re: RegExp[] };

const l = (uz: string, ru: string, en: string): L3 => ({ uz, ru, en });

const CONCEPTS: Concept[] = [
  // ── General ────────────────────────────────────────────────────────────
  { label: l("isitma", "температура", "fever"), to: { Terapevt: 2 }, re: [/harorat|isitma|temperatura/, /температур|лихорад|знобит|озноб/, /fever|temperature|chills/] },
  { label: l("yo'tal", "кашель", "cough"), to: { Terapevt: 2 }, re: [/yo'?tal/, /кашел|кашля/, /cough/] },
  { label: l("shamollash", "простуда", "a cold"), to: { Terapevt: 2 }, re: [/shamolla|gripp|badan\S{0,4} ?(qaqsha|zirqira)/, /простуд|простыл|грипп|ломит/, /\bcold\b|\bflu\b|body aches?/] },
  { label: l("holsizlik", "слабость", "weakness"), to: { Terapevt: 2 }, re: [/holsiz|darmonsiz|charcha|ishtaha/, /слабост|устал|утомля|аппетит/, /weak|tired|fatigue|appetite|exhaust/] },
  { label: l("qon bosimi", "давление", "blood pressure"), to: { Kardiolog: 2, Terapevt: 1.5 }, re: [/bosim/, /давлени/, /blood pressure|hypertens/] },
  { label: l("umumiy ko'rik", "общий осмотр", "a general check-up"), to: { Terapevt: 3 }, re: [/umumiy ko'?rik|ma'?lumotnoma|spravka/, /справк|медосмотр|общий осмотр|диспансер/, /general (check|exam)|certificate|physical exam/] },

  // ── Nerves ─────────────────────────────────────────────────────────────
  { label: l("bosh og'rig'i", "головная боль", "headache"), to: { Nevrolog: 3 }, re: [/(bosh|chakka|ensa|peshona)\S{0,5} ?(\S+ ){0,2}(og'?ri|lo'?qilla|siq)|migren/, /головн\S+ бол|бол\S+ голов|голова (сильно |часто )?болит|раскалыва\S+ голов|голова (трещит|гудит|раскалывается)|мигрен|в висках/, /headache|migraine|head (hurts|aches|is pounding)|temples?\b|throbbing/] },
  { label: l("yorug'likka sezgirlik", "чувствительность к свету", "sensitivity to light"), to: { Nevrolog: 2 }, re: [/yorug'?lik/, /ярк\S+ свет|светобоязн|от света/, /light hurts|bright light|sensitiv\S* to light/] },
  { label: l("bosh aylanishi", "головокружение", "dizziness"), to: { Nevrolog: 2.5 }, re: [/bosh\S{0,5} ?aylan|muvozanat/, /кружит|головокруж|равновес/, /dizz|vertigo|lightheaded/] },
  { label: l("uvushish", "онемение", "numbness"), to: { Nevrolog: 3 }, re: [/uvush|karaxt|jimirla/, /онем|немеют|немеет|покалыв|мурашк/, /numb|tingl|pins and needles/] },
  { label: l("uyqu buzilishi", "нарушение сна", "sleep problems"), to: { Nevrolog: 2, Terapevt: 1 }, re: [/uyqu|uxlay ?olma|uxlolma/, /бессонн|не могу уснуть|плохо сплю/, /insomnia|can'?t sleep|trouble sleeping/] },
  { label: l("bel yoki bo'yin og'rig'i", "боль в спине или шее", "back or neck pain"), to: { Nevrolog: 2, Travmatolog: 1 }, re: [/bel\S{0,4} ?og'?ri|bo'?yn\S{0,4} ?og'?ri|umurtqa/, /спин|поясниц|(^|\s)ше[яю]|позвоноч/, /back pain|neck pain|lower back|spine/] },
  { label: l("qaltirash", "дрожь", "tremor"), to: { Nevrolog: 2 }, re: [/titra|qaltira/, /тремор|дрожат|дрожь/, /tremor|shaking hands|shaky/] },

  // ── Heart ──────────────────────────────────────────────────────────────
  { label: l("yurak urishining tezlashishi", "сердцебиение", "palpitations"), to: { Kardiolog: 3 }, re: [/yura(k|g)\S{0,6} ?(\S+ )?(tez|notekis|o'?yna|ur(ib|ad|yap))|notekis ur/, /сердцеби|перебо\S+ в сердце|сердце (колотится|стучит)/, /palpitat|heart (is )?(racing|pounding|skipping)|irregular heartbeat/] },
  { label: l("yurak sohasida noqulaylik", "дискомфорт в области сердца", "chest discomfort"), to: { Kardiolog: 3 }, re: [/yura(k|g)\S{0,6} ?(\S+ ){0,2}(og'?ri|sanch|siqil)|ko'?kra(k|g)\S{0,8} ?(\S+ ){0,2}(og'?ri|siqil)/, /сердц|сердеч|в груди|грудн\S+ клетк/, /\bheart\b|chest (pain|tight|discomfort|pressure)/] },
  { label: l("oyoq shishi", "отёки ног", "swollen legs"), to: { Kardiolog: 2 }, re: [/oyo(q|g'?)\S{0,6} ?shish/, /отек\S* ног|ноги отекают|отекают ноги/, /ankles? swell|swollen (ankles|legs|feet)|legs? swell/] },
  { label: l("hansirash", "одышка", "breathlessness"), to: { Kardiolog: 2 }, re: [/hansira|nafas\S{0,4} ?qis/, /одышк/, /short(ness)? of breath|out of breath|breathless/] },

  // ── Ear, nose, throat ──────────────────────────────────────────────────
  { label: l("tomoq og'rig'i", "боль в горле", "sore throat"), to: { LOR: 3 }, re: [/tomo(q|g'?)|yut(ish|in|olma)|ovoz\S{0,4} ?(bo'?g'?il|xirilla|yo'?qol)/, /горл|глота|ангин|охрип|осип/, /throat|swallow|hoarse|tonsil/] },
  { label: l("quloq shikoyati", "жалобы на ухо", "ear trouble"), to: { LOR: 3 }, re: [/qulo(q|g'?)|eshit|shang'?illa/, /(^|\s)ух[оаеу](?=$|[\s.,!?])|в ухе|в ушах|(^|\s)уши(?=$|[\s.,!?])|слух|слыш|отит/, /\bears?\b|hearing|earache/] },
  { label: l("burun bitishi", "заложенность носа", "blocked nose"), to: { LOR: 3 }, re: [/burun|burn\S{0,6} ?(\S+ ){0,2}(bit|oq|qon)|tumov|gaymorit|sinus|hid bil/, /(^|\s)нос(?=$|[\s.,!?])|носа|насморк|заложен|гаймор|синус/, /\bnose\b|sinus|runny|congest|nosebleed/] },

  // ── Eyes ───────────────────────────────────────────────────────────────
  { label: l("ko'z shikoyati", "жалобы на глаза", "eye trouble"), to: { Oftalmolog: 4 }, re: [/ko'?z(?![a-z']*r)\S{0,6}/, /глаз|(^|\s)век(о|и|ах)(?=$|[\s.,!?])/, /\beyes?\b|eyelid/] },
  { label: l("ko'rishning o'zgarishi", "изменение зрения", "a change in vision"), to: { Oftalmolog: 3 }, re: [/ko'?rish\S{0,4} ?(xira|pasay|yomon)|xiralash|ko'?rmayap|ko'?ra ?olmay|ikkilan\S* ko'?rin|harflar/, /зрени|плохо вижу|двоит|буквы/, /vision|blurr|can'?t see|doubled?\b|seeing double|letters (look|are|seem)/] },

  // ── Skin ───────────────────────────────────────────────────────────────
  { label: l("toshma", "сыпь", "rash"), to: { Dermatolog: 3 }, re: [/toshma|qavar|ekzema|(^|\s)teri\S{0,5}|dog'?(lar)?(?=$|[\s.,!?])|po'?st tashla/, /сып|кож|экзем|волдыр|крапивниц|пятн|шелуш/, /rash|\bskin\b|eczema|hives|blister|patch(es)?\b|\bspots?\b|peel|flak/] },
  { label: l("qichishish", "зуд", "itching"), to: { Dermatolog: 2 }, re: [/qichi/, /зуд|чешет/, /itch/] },
  { label: l("husnbuzar", "прыщи", "acne"), to: { Dermatolog: 3 }, re: [/husnbuzar|sizlog'?ich/, /прыщ|акне|угр(и|ей)(?=$|[\s.,!?])/, /acne|pimple/] },
  { label: l("soch yoki tirnoq muammosi", "проблема с волосами или ногтями", "a hair or nail problem"), to: { Dermatolog: 3 }, re: [/soch\S{0,5} ?to'?k|tirno(q|g')|qazg'?oq/, /выпад\S+ волос|волосы выпад|ногт|перхот/, /hair (loss|is falling|falling)|\bnails?\b|dandruff/] },
  { label: l("xol", "родинка", "a mole"), to: { Dermatolog: 3 }, re: [/(^|\s)xol(im|i|lar)?(?=$|[\s.,!?])/, /родинк/, /\bmoles?\b/] },

  // ── Women's health ─────────────────────────────────────────────────────
  { label: l("hayz bilan bog'liq muammo", "нарушение цикла", "period problems"), to: { Ginekolog: 4 }, re: [/hayz|oylik\S{0,6} ?(\S+ )?(kech|kel|og'?ri|buzil)|sikl|ayollik|bachadon|tuxumdon/, /месячн|менструа|гинеколог|матк|яичник|(^|\s)цикл/, /\bperiods?\b|menstrua|\bcycle\b|pelvic|vaginal|uterus|ovar/] },
  { label: l("homiladorlik", "беременность", "pregnancy"), to: { Ginekolog: 5 }, re: [/homilador/, /беремен/, /pregnan/] },

  // ── Injuries and joints ────────────────────────────────────────────────
  { label: l("jarohat", "травма", "an injury"), to: { Travmatolog: 4 }, re: [/yiqil|sin(ib|di|gan)|lat ye|(bo'?g'?im|yelka|tizza|bilak|to'?pi(q|g')|oyo(q|g'?)|qo'?l)\S{0,5} chiqib ket|bura(b|l)|jarohat|urib ol|zarba|qayril|qimirlamay/, /упал|упала|перелом|вывих|растяж|травм|ушиб|подверн|ударил/, /\bfell\b|\bfall\b|fracture|broken|sprain|injur|twist|bruise|can'?t (lift|move) my/] },
  { label: l("bo'g'im og'rig'i", "боль в суставе", "joint pain"), to: { Travmatolog: 2, Terapevt: 1 }, re: [/tizza|bo'?g'?im|to'?pi(q|g')|tirsak|yelka|bilak/, /колен|сустав|лодыжк|локт|плеч/, /\bknees?\b|joint|ankle|elbow|wrist|shoulder/] },

  // ── Digestion ──────────────────────────────────────────────────────────
  { label: l("qorin og'rig'i", "боль в животе", "stomach pain"), to: { Gastroenterolog: 3 }, re: [/oshqozon|qorin|qorn\S{0,4}|me'?da/, /живот|желуд/, /stomach|belly|abdom|tummy/] },
  { label: l("ko'ngil aynishi", "тошнота", "nausea"), to: { Gastroenterolog: 3 }, re: [/ko'?ng(i)?l\S{0,4} ?ayn|qus(ish|yap|dim|ib)|qayt qil/, /тошн|рвот|рвет/, /nause|vomit|throw(ing)? up/] },
  { label: l("ich kelishining buzilishi", "расстройство стула", "bowel trouble"), to: { Gastroenterolog: 3 }, re: [/ich\S{0,3} ?(ket|qot|buzil|kelmay)|qabziyat/, /понос|диаре|запор|(^|\s)стул(?=$|[\s.,!?])/, /diarr|constipat|loose stools?|bowel/] },
  { label: l("jig'ildon qaynashi", "изжога", "heartburn"), to: { Gastroenterolog: 3 }, re: [/zarda|jig'?ildon|kekir|dam bo'?l/, /изжог|вздут|отрыжк|тяжест\S+ в (желудке|животе)/, /heartburn|bloat|reflux|belch|indigest|after (every|each|a) meal/] },

  // ── Hormones ───────────────────────────────────────────────────────────
  { label: l("qand miqdori", "сахар в крови", "blood sugar"), to: { Endokrinolog: 4 }, re: [/qand|shakar|diabet/, /сахар|диабет/, /sugar|diabet/] },
  { label: l("qalqonsimon bez", "щитовидная железа", "thyroid"), to: { Endokrinolog: 4 }, re: [/qalqonsimon|buqoq/, /щитовид/, /thyroid|goit/] },
  { label: l("chanqoq", "жажда", "thirst"), to: { Endokrinolog: 2 }, re: [/chanqa|ko'?p suv ich|og'?(i)?z\S{0,4} ?quri/, /жажд|сухость во рту|много пью/, /thirst|dry mouth/] },
  { label: l("vazn o'zgarishi", "изменение веса", "weight change"), to: { Endokrinolog: 2, Terapevt: 1 }, re: [/vazn|ozib|semir/, /(^|\s)вес(а|е|ом)?(?=$|[\s.,!?])|похуд|набрал\S* вес/, /weight/] },

  // ── Urinary ────────────────────────────────────────────────────────────
  { label: l("siyish bilan bog'liq muammo", "проблемы с мочеиспусканием", "urination problems"), to: { Urolog: 4 }, re: [/siy(ish|gan|dik|gim|yap)|siyd|peshob|hojat/, /моч|позыв|по-маленькому|в туалет/, /urin|\bpee\b|bladder|toilet/] },
  { label: l("buyrak sohasidagi og'riq", "боль в области почек", "kidney-area pain"), to: { Urolog: 3 }, re: [/buyra(k|g)/, /почк|почек/, /kidney/] },
  { label: l("prostata", "простата", "prostate"), to: { Urolog: 4 }, re: [/prostat/, /простат/, /prostat/] },
];

// ── Is this about a child? ──────────────────────────────────────────────
const CHILD_WORDS: RegExp[] = [
  /(^|\s)bola|farzand|chaqalo|nevara|go'?dak|o'?smir|o'?g'?l(im|imiz|i)(?=$|[\s.,!?n])|qiz(im|cham|chasi|aloq)/,
  /ребен|малыш|младен|(^|\s)сын|дочк|дочь|дочер|внук|внучк|подрост/,
  /\bchild(ren)?\b|\bkids?\b|\bbaby\b|\bson\b|daughter|toddler|infant|newborn|teenager|grandson|granddaughter|grandchild|nephew|niece|little (boy|girl)/,
];
const AGE: RegExp[] = [
  /(\d{1,3}) ?(yosh|oylik)/g,
  /(\d{1,3}) ?(лет|года?|месяц)/g,
  /(\d{1,3})[- ]?(years?|yrs?|months?)[- ]?old|aged? (\d{1,3})/g,
];

/** A stated age wins over family words: "my son is 30" is an adult, "I am 45" is not a child. */
function isChild(t: string): boolean {
  const ages: number[] = [];
  for (const re of AGE) {
    for (const m of t.matchAll(re)) {
      const n = Number(m[1] ?? m[4]);
      if (!Number.isFinite(n)) continue;
      ages.push(/oylik|месяц|month/.test(m[0]) ? 0 : n);
    }
  }
  if (ages.length) return ages.some((a) => a < 18);
  return CHILD_WORDS.some((p) => p.test(t));
}

const SEVERE: RegExp[] = [
  /kuchli|qattiq|chidab bo'?lmas|juda og'?ri|39|40 daraja/,
  /сильн|невыносим|очень болит|39|40 градус/,
  /severe|unbearable|very painful|39|40 ?(°|degrees)/,
];

// ── Wording ─────────────────────────────────────────────────────────────
const WHY: Record<Specialty, L3> = {
  Terapevt: l("Bunday umumiy belgilarni avval terapevt ko'radi va kerak bo'lsa, tor mutaxassisga yo'naltiradi.", "С такими общими жалобами сначала принимает терапевт и при необходимости направляет к узкому специалисту.", "A general practitioner sees complaints like these first and refers you on if needed."),
  Nevrolog: l("Bosh og'rig'i, bosh aylanishi va uvushish kabi belgilar bilan nevrolog shug'ullanadi.", "Головной болью, головокружением и онемением занимается невролог.", "A neurologist deals with headaches, dizziness and numbness."),
  Kardiolog: l("Yurak va qon bosimi bilan bog'liq belgilarni kardiolog tekshiradi.", "Жалобы, связанные с сердцем и давлением, проверяет кардиолог.", "A cardiologist checks complaints to do with the heart and blood pressure."),
  LOR: l("Quloq, burun va tomoq shikoyatlarini LOR shifokori ko'radi.", "Жалобы на ухо, горло и нос смотрит ЛОР-врач.", "An ENT doctor looks at ear, nose and throat complaints."),
  Pediatr: l("18 yoshgacha bo'lgan bolalarni avval pediatr ko'radi.", "Детей до 18 лет сначала осматривает педиатр.", "Children under 18 are seen by a paediatrician first."),
  Oftalmolog: l("Ko'z va ko'rish bilan bog'liq shikoyatlarni oftalmolog tekshiradi.", "Жалобы на глаза и зрение проверяет офтальмолог.", "An ophthalmologist checks complaints about the eyes and vision."),
  Dermatolog: l("Teri, soch va tirnoq muammolari bilan dermatolog shug'ullanadi.", "Проблемами кожи, волос и ногтей занимается дерматолог.", "A dermatologist deals with skin, hair and nail problems."),
  Ginekolog: l("Ayollar salomatligi va homiladorlik masalalarini ginekolog ko'radi.", "Вопросы женского здоровья и беременности ведёт гинеколог.", "A gynaecologist looks after women's health and pregnancy."),
  Travmatolog: l("Jarohat va bo'g'im og'riqlarini travmatolog tekshiradi.", "Травмы и боли в суставах осматривает травматолог.", "A trauma doctor examines injuries and joint pain."),
  Gastroenterolog: l("Oshqozon va hazm qilish bilan bog'liq belgilarni gastroenterolog ko'radi.", "Жалобы на желудок и пищеварение смотрит гастроэнтеролог.", "A gastroenterologist looks at stomach and digestion complaints."),
  Endokrinolog: l("Qand miqdori, qalqonsimon bez va vazn o'zgarishini endokrinolog tekshiradi.", "Сахар, щитовидную железу и изменения веса проверяет эндокринолог.", "An endocrinologist checks blood sugar, the thyroid and weight changes."),
  Urolog: l("Siydik yo'llari va buyrak bilan bog'liq shikoyatlarni urolog ko'radi.", "Жалобы, связанные с мочевыми путями и почками, смотрит уролог.", "A urologist looks at urinary and kidney complaints."),
};

const VAGUE: L3 = l(
  "Yozganlaringizdan aniq belgini ajrata olmadim, shuning uchun avval terapevtga borish to'g'ri bo'ladi — u kerakli mutaxassisga yo'naltiradi.",
  "По описанию не удалось выделить конкретный признак, поэтому лучше начать с терапевта — он направит к нужному специалисту.",
  "I could not pick out a specific sign from your description, so a general practitioner is the right first step and can refer you on.",
);

const HOW_LONG: L3 = l("Bu belgilar qachondan beri bezovta qilmoqda?", "Как давно появились эти симптомы?", "How long have you had these symptoms?");

const PREP: Record<Specialty, [L3, L3]> = {
  Terapevt: [l("Haroratingiz necha darajagacha ko'tarildi?", "До скольки поднималась температура?", "How high has your temperature been?"), l("Hozir qanday dori ichyapsiz?", "Какие лекарства вы сейчас принимаете?", "Which medicines are you taking now?")],
  Nevrolog: [l("Og'riq qayerda va qanday paytda kuchayadi?", "Где именно болит и когда усиливается?", "Where exactly is the pain and when does it get worse?"), l("Ko'ngil aynishi yoki ko'rishning o'zgarishi bo'ladimi?", "Бывает ли тошнота или нарушение зрения?", "Do you get nausea or changes in vision?")],
  Kardiolog: [l("Belgilar jismoniy zo'riqishda paydo bo'ladimi yoki tinch holatdami?", "Симптомы появляются при нагрузке или в покое?", "Do the symptoms come on with effort or at rest?"), l("Qon bosimingizni o'lchaganmisiz, qancha chiqdi?", "Измеряли ли вы давление и какие были цифры?", "Have you measured your blood pressure, and what were the readings?")],
  LOR: [l("Haroratingiz ko'tarildimi?", "Поднималась ли температура?", "Have you had a fever?"), l("Yutish yoki burundan nafas olish qiyinlashdimi?", "Трудно ли глотать или дышать носом?", "Is it hard to swallow or to breathe through your nose?")],
  Pediatr: [l("Bolaning yoshi va vazni qancha?", "Сколько ребёнку лет и какой у него вес?", "How old is the child and what do they weigh?"), l("Harorati necha daraja, ovqat va suyuqlikni qanday qabul qilyapti?", "Какая температура, как ребёнок ест и пьёт?", "What is the temperature, and is the child eating and drinking?")],
  Oftalmolog: [l("Bir ko'zdami yoki ikkalasidami?", "Беспокоит один глаз или оба?", "Is it one eye or both?"), l("Ko'zoynak yoki linza taqasizmi?", "Носите ли вы очки или линзы?", "Do you wear glasses or contact lenses?")],
  Dermatolog: [l("Qayerda boshlandi va tarqalyaptimi?", "Где началось и распространяется ли?", "Where did it start and is it spreading?"), l("Yaqinda yangi ovqat, dori yoki kosmetika ishlatdingizmi?", "Были ли недавно новые продукты, лекарства или косметика?", "Any new food, medicine or cosmetics recently?")],
  Ginekolog: [l("Oxirgi hayz qachon bo'lgan edi?", "Когда была последняя менструация?", "When was your last period?"), l("Homiladorlik ehtimoli bormi?", "Возможна ли беременность?", "Could you be pregnant?")],
  Travmatolog: [l("Jarohat qachon va qanday sodir bo'ldi?", "Когда и как произошла травма?", "When and how did the injury happen?"), l("Shu joyga tayanish yoki uni harakatlantirish mumkinmi?", "Можете ли вы опираться на это место или двигать им?", "Can you put weight on it or move it?")],
  Gastroenterolog: [l("Og'riq ovqat bilan bog'liqmi — oldinmi yoki keyin?", "Связана ли боль с едой — до или после?", "Is the pain linked to meals — before or after?"), l("Ich kelishi o'zgardimi?", "Изменился ли стул?", "Have your bowel habits changed?")],
  Endokrinolog: [l("Qand miqdorini o'lchaganmisiz, qancha chiqdi?", "Измеряли ли вы сахар и какие были показатели?", "Have you measured your blood sugar, and what were the results?"), l("Vazningiz so'nggi oylarda o'zgardimi?", "Менялся ли вес за последние месяцы?", "Has your weight changed in recent months?")],
  Urolog: [l("Siyganda og'riq yoki achishish bormi?", "Есть ли боль или жжение при мочеиспускании?", "Is there pain or burning when you urinate?"), l("Siydik rangi o'zgardimi, harorat ko'tarildimi?", "Менялся ли цвет мочи, была ли температура?", "Has the colour of your urine changed, or have you had a fever?")],
};

const CLARIFY_Q: L3 = l("Sizni ko'proq nima bezovta qilyapti?", "Что беспокоит вас больше всего?", "What is bothering you most?");

/** Tap answers for the clarifying question. Each one is a phrase this router understands. */
export const CLARIFY_OPTIONS: Record<Locale, string[]> = {
  uz: ["Harorat yoki yo'tal", "Bosh og'rig'i", "Tomoq, quloq yoki burun", "Yurak yoki qon bosimi", "Qorin yoki oshqozon", "Teri toshmasi"],
  ru: ["Температура или кашель", "Головная боль", "Горло, ухо или нос", "Сердце или давление", "Живот или желудок", "Сыпь на коже"],
  en: ["Fever or cough", "Headache", "Throat, ear or nose", "Heart or blood pressure", "Stomach or belly", "Skin rash"],
};

function joinList(items: string[], locale: Locale): string {
  if (items.length <= 1) return items.join("");
  const and = locale === "uz" ? " va " : locale === "ru" ? " и " : " and ";
  return `${items.slice(0, -1).join(", ")}${and}${items.at(-1)}`;
}

function reason(labels: string[], spec: Specialty, locale: Locale): string {
  if (!labels.length) return spec === "Pediatr" ? WHY.Pediatr[locale] : VAGUE[locale];
  const list = joinList(labels, locale);
  const lead = locale === "uz" ? `Siz ${list} haqida yozdingiz.` : locale === "ru" ? `Вы описали: ${list}.` : `You described: ${list}.`;
  return `${lead} ${WHY[spec][locale]}`;
}

export function keywordRoute(
  raw: string,
  locale: Locale,
  opts: { emergency?: boolean; script?: Script; noClarify?: boolean } = {},
): RouterOutput {
  const t = matchText(raw);
  const scores = new Map<Specialty, number>();
  const hits: Array<{ concept: Concept; weight: number }> = [];
  for (const concept of CONCEPTS) {
    if (!concept.re.some((p) => p.test(t))) continue;
    hits.push({ concept, weight: Math.max(...Object.values(concept.to)) });
    for (const [spec, w] of Object.entries(concept.to) as Array<[Specialty, number]>) scores.set(spec, (scores.get(spec) ?? 0) + w);
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [top, second] = ranked;
  const child = isChild(t);

  const specialty: Specialty = child ? "Pediatr" : (top?.[0] ?? "Terapevt");
  const bestScore = child ? Math.max(3, top?.[1] ?? 0) : (top?.[1] ?? 0);
  const margin = child ? bestScore : bestScore - (second?.[1] ?? 0);
  const confidence = bestScore >= 3 && margin >= 2 ? "medium" : "low";

  // What we understood, most relevant to the chosen specialist first.
  const understood = hits
    .sort((a, b) => (b.concept.to[specialty] ?? 0) - (a.concept.to[specialty] ?? 0) || b.weight - a.weight)
    .slice(0, 3)
    .map((h) => h.concept.label[locale]);

  // A second option when the picture is mixed.
  const runnerUp = child ? top : second;
  const alternative = runnerUp && runnerUp[0] !== specialty && runnerUp[1] >= 2 && (child || bestScore - runnerUp[1] <= 2) ? runnerUp[0] : "none";

  const vague = hits.length === 0 && !child;
  const urgency = opts.emergency ? "emergency" : SEVERE.some((p) => p.test(t)) ? "soon" : "routine";
  const out: RouterOutput = {
    specialty,
    confidence,
    reason_short: reason(understood, specialty, locale),
    urgency,
    follow_up_questions: [HOW_LONG[locale], PREP[specialty][0][locale], PREP[specialty][1][locale]],
    alternative,
    understood,
    clarifying_question: vague && !opts.noClarify && !opts.emergency ? CLARIFY_Q[locale] : "",
    quick_replies: vague && !opts.noClarify && !opts.emergency ? CLARIFY_OPTIONS[locale] : [],
  };

  // Answer in the script the patient used.
  if (locale === "uz" && opts.script === "cyrillic") {
    out.reason_short = uzLatinToCyrillic(out.reason_short);
    out.follow_up_questions = out.follow_up_questions.map(uzLatinToCyrillic);
    out.understood = out.understood.map(uzLatinToCyrillic);
    out.clarifying_question = uzLatinToCyrillic(out.clarifying_question);
    out.quick_replies = out.quick_replies.map(uzLatinToCyrillic);
  }
  return out;
}
