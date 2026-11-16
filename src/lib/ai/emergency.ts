import { anyMatch, matchText } from "./normalize";

/**
 * Deterministic red-flag detector. Runs BEFORE and independently of the
 * model, on the raw symptom text, in Uzbek (Latin + Cyrillic), Russian and
 * English. It is deliberately over-inclusive: a false alarm costs a click,
 * a missed emergency costs much more.
 *
 * Rules run on `matchText`, which appends an Uzbek-Latin transliteration of any
 * Cyrillic input — so every Uzbek rule below also covers Uzbek written in Cyrillic.
 */

export type EmergencyCategory =
  | "chest_pain_breathing"
  | "breathing"
  | "stroke"
  | "bleeding"
  | "unconscious"
  | "anaphylaxis"
  | "seizure"
  | "self_harm"
  | "poisoning"
  | "pregnancy_bleeding"
  | "labor"
  | "bite";

export type EmergencyResult = { isEmergency: boolean; categories: EmergencyCategory[] };

const CHEST: RegExp[] = [
  /chest (pain|tight|pressure|hurt)/,
  /pain in (my |the )?chest/,
  /chest (is|feels) (tight|heavy|hurting)/,
  /ko'?kra(k|g)\S{0,8} ?(\S+ ){0,2}(og'?ri|siqil|qis|achish|sanch)/,
  /yura(k|g)\S{0,6} ?(\S+ ){0,2}(og'?ri|siqil|sanch)/,
  /(crushing|squeezing|tight(ness)?|pressure) (in|on) (my |the )?chest/,
  /(crushing|squeezing) chest/,
  /кўкра\S{0,6} ?(оғри|сиқил)/,
  /юра(к|г)\S{0,4} ?оғри/,
  /бол\S{0,3}.{0,15}груд/,
  /груд\S{0,4}.{0,15}бол/,
  /(давит|жжет|сжимает|колет) в груди/,
  /(сердце болит|боль в сердце|болит сердце)/,
];

const BREATH: RegExp[] = [
  /short(ness)? of breath/,
  /breathless/,
  /(can'?t|cannot|hard to|unable to|struggling to|difficult(y)? to) breathe/,
  /(difficulty|trouble|problems?) breathing/,
  /nafas\S{0,4} ?(qis|siqil|yetish|yetmay|ololma|olish qiyin|olishim qiyin|bo'?g'?il|to'?xta)/,
  /bo'?g'?ilyap/,
  /hansira/,
  /nafas\S{0,6} ?(\S+ )?(qiyin|og'?ir)/,
  /нафас\S{0,4} ?(қис|сиқил|етиш|етмай|ололма)/,
  /одышк/,
  /задыха/,
  /(не хватает|нехватка) воздуха/,
  /(трудно|тяжело|не могу|нечем|невозможно) дышать/,
];

const BREATH_SEVERE: RegExp[] = [
  /(can'?t|cannot|unable to) breathe/,
  /(not|stopped) breathing/,
  /chok(ing|ed|es)|gasping|can'?t catch (my|his|her|their) breath/,
  /(lips?|face) (\S+ ){0,2}(blue|purple)/,
  /bo'?g'?il(yap|ib|di)|tiqilib qol|lab\S{0,5} ?ko'?kar/,
  /подавил|поперхнул|синеют губы|губы (синие|синеют|посинели)/,
  /nafas ?ololma/,
  /nafas olmayap/,
  /nafas\S{0,4} to'?xta/,
  /ko'?karib (ket|qol)/,
  /не (могу|может) дышать/,
  /не дышит/,
  /задыхаюсь|задыхается/,
  /посинел/,
];

/** With chest pain, any of these makes it an emergency even without breathing trouble. */
const CHEST_AGGRAVATORS: RegExp[] = [
  /qattiq|kuchli|chidab bo'?lmas|juda (qattiq|kuchli)/,
  /sovuq ter|ter bos|terlab ket/,
  /сильн|невыносим|острая|резкая|холодный пот|потею|потливост/,
  /severe|crushing|unbearable|worst|cold sweat|sweating|sweaty/,
];

const RADIATING: RegExp[] = [
  /chest.{0,40}(left arm|arm|jaw)/,
  /ko'?kra.{0,40}(chap qo'?l|qo'?l|jag')/,
  /груд.{0,40}(левую руку|руку|челюст|лопатк)/,
];

const STROKE: RegExp[] = [
  /\bstroke\b/,
  /face (is )?droop|drooping face|face (went|is) numb/,
  /slurred speech|can'?t speak (properly|clearly)|trouble speaking/,
  /sudden(ly)? (weakness|numbness|confusion)/,
  /one side of (my |the |his |her )?(body|face)/,
  /\binsult/,
  /(yuz|og'?[i]?z)\S{0,3} ?(\S+ ){0,3}(qiyshay|qiyshiq|burilib)/,
  /qo'?l\S{0,5} ?(\S+ )?(ko'?tarilmay|ko'?tara ?olmay)/,
  /can'?t (lift|raise|move) (my |his |her |the )?(arm|leg|hand)|can'?t feel (the |my |his |her )?(left|right|one) side/,
  /не (может|могу) поднять (руку|ногу)|не чувству\S+ (половин|сторон|руку|ногу)/,
  /til\S{0,3} ?(aylanmay|gapirmay|kalimay)/,
  /gapira ?olmay/,
  /nutq\S{0,3} ?(buzil|tutil)/,
  /bir tomon\S{0,3} ?(falaj|uvush|ishlamay|harakatlanmay|sezmay)/,
  /инсульт/,
  /(юз|оғиз)\S{0,3} ?қийшай/,
  /(перекосило|перекосилось) лицо|лицо перекос/,
  /онемел\S{0,3}.{0,20}(половин|сторон)/,
  /(нарушилась|невнятная|спутанная) речь|не может говорить/,
  /отнял\S{0,3} (рука|нога)/,
  /to'?satdan.{0,40}(ishlamay|harakatlanmay|uvush|falaj|ko'?rmay qol|gapira ?olmay)/,
  /qo'?l\S{0,5}.{0,25}oyo(q|g'?)\S{0,5}.{0,10}(ishlamay|harakatlanmay|uvush)/,
  /внезапн\S*.{0,40}(онемел|отнял|ослабл|перестал\S* (двигаться|работать|видеть|говорить))/,
  /sudden(ly)?.{0,40}(can'?t (move|speak|see|talk)|lost (my |the )?(vision|speech)|went numb)/,
];

const BLEEDING: RegExp[] = [
  /(severe|heavy|a lot of|uncontrolled|massive|serious) bleeding/,
  /blood (is )?(everywhere|spurting|gushing|pouring)|(spurting|gushing|pouring) blood|(cut|wound) is (spurting|gushing)/,
  /qon\S{0,4} ?(\S+ ){0,2}(otil|favvora|oqib yot)/,
  /кровь (хлещет|фонтаном|льется|не унять)/,
  /bleeding (heavily|a lot|won'?t stop|doesn'?t stop|non-?stop|badly)/,
  /won'?t stop bleeding/,
  /(vomiting|throwing up|coughing( up)?) blood/,
  /qon\S{0,3} (to'?xtamay|to'?xtamayap|ketishi to'?xtamay)/,
  /(kuchli|ko'?p|juda ko'?p|qattiq) qon ket/,
  /qon (qus|tupur)/,
  /қон\S{0,3} тўхтамай/,
  /(сильное|обильное|сильно) кровотеч/,
  /кров\S{0,3} не (останавливается|остановить)/,
  /не останавливается кров/,
  /(рвота кровью|кашляю кровью|кашель с кровью)/,
  /(рвота|рвет|рвало|кашель|кашляю|кашляет) (с )?кровью/,
  /кровь в рвоте|черный стул|дегтеобразн/,
  /qora (najas|axlat)|najas\S{0,4} qora|qon aralash qus/,
  /black (tarry )?stools?|tarry stools?|blood in (my |the )?vomit|vomit(ed|ing)? blood/,
];

const UNCONSCIOUS: RegExp[] = [
  /unconscious|passed out|fainted|fainting|lost consciousness|unresponsive|not responding|collapsed/,
  /(isn'?t|is not|won'?t|not|can'?t) wak(e|ing)( (him|her|them))? up|can'?t wake/,
  /o'?ziga kelmay|uyg'?onmay|javob bermay/,
  /не приходит в себя|без чувств|не просыпается|не отвечает/,
  /hush\S{0,4} ?(yo'?qot|ketdi|ketib|ketyap)/,
  /hushsiz/,
  /es\S{0,3}ni yo'?qot/,
  /ҳуш\S{0,4} ?(йўқот|кетди|кетиб)/,
  /без сознания|потерял\S{0,2} сознани|потеря сознания|обморок|не реагирует/,
];

const ANAPHYLAXIS: RegExp[] = [
  /anaphyla/,
  /throat (is )?(swelling|closing|tight)/,
  /(tongue|lips?|face|throat) (is |are )?(swelling|swollen)/,
  /swollen (throat|tongue)/,
  /severe allerg/,
  /anafilak/,
  /tomo(q|g'?)\S{0,3} ?(shish|yopil|bo'?g'?il)/,
  /til\S{0,3} shish/,
  /kuchli allergi/,
  /анафилак/,
  /отек (горла|языка|гортани|лица)|квинке/,
  /(опух|отек)\S*.{0,20}(язык|губ|горл)|(язык|губы|горло)\S*.{0,12}(опух|отек)/,
  /(lab|til)\S{0,5} ?(\S+ )?shish/,
  /горло (опухло|отекло|сжимается)/,
  /сильная аллерги/,
];

const SEIZURE: RegExp[] = [/seizure|convulsion/, /tutqanoq|talvasa/, /тутқаноқ/, /судорог|припадок|эпилептическ/];

const SELF_HARM: RegExp[] = [
  /suicid|kill myself|end my life|want to die/,
  /o'?z joni\S{0,3}ga qasd|o'?zimni o'?ldir|yashagim kelmay/,
  /суицид|покончить с собой|убить себя|не хочу жить/,
];

const POISONING: RegExp[] = [
  /overdose|poisoned|poisoning|swallowed (poison|bleach|chemical)|carbon monoxide/,
  /zaharlan|dorini ko'?p ichib|is gazi|tabletkalarni ko'?p ich/,
  /отравил|отравлен|передозиров|угарн/,
];

/** Snake, scorpion and karakurt bites — a real risk in the Fergana valley. */
const BITE: RegExp[] = [
  /ilon\S{0,4} ?(chaq|tishla)|chayon\S{0,4} ?chaq|qoraqurt/,
  /зме\S{1,3}.{0,12}укус|укус\S{0,4}.{0,12}(зме|скорпион|каракурт)|скорпион\S{0,2} ужал|каракурт/,
  /(snake|scorpion) ?(bite|bit|sting|stung)|(bitten|stung) by a (snake|scorpion)|black widow/,
];

/** Signs that labour has started. */
const LABOR: RegExp[] = [
  /suv\S{0,4} ket|to'?lg'?o(q|g')/,
  /отошли воды|воды отошли|схватк/,
  /waters? (has |have )?broke|contractions|in labou?r/,
];

const PREGNANT: RegExp[] = [/pregnan/, /homilador/, /ҳомиладор/, /беремен/];
const ANY_BLEED: RegExp[] = [/bleed/, /qon ket|qon kel/, /қон кет/, /кровотеч|кровь/];

export function detectEmergency(raw: string): EmergencyResult {
  const t = matchText(raw);
  const cats: EmergencyCategory[] = [];
  const chest = anyMatch(t, CHEST);
  const breath = anyMatch(t, BREATH);
  if ((chest && (breath || anyMatch(t, CHEST_AGGRAVATORS))) || anyMatch(t, RADIATING)) cats.push("chest_pain_breathing");
  if (anyMatch(t, BREATH_SEVERE)) cats.push("breathing");
  if (anyMatch(t, STROKE)) cats.push("stroke");
  if (anyMatch(t, BLEEDING)) cats.push("bleeding");
  if (anyMatch(t, UNCONSCIOUS)) cats.push("unconscious");
  if (anyMatch(t, ANAPHYLAXIS)) cats.push("anaphylaxis");
  if (anyMatch(t, SEIZURE)) cats.push("seizure");
  if (anyMatch(t, SELF_HARM)) cats.push("self_harm");
  if (anyMatch(t, POISONING)) cats.push("poisoning");
  const pregnant = anyMatch(t, PREGNANT);
  if (pregnant && anyMatch(t, ANY_BLEED)) cats.push("pregnancy_bleeding");
  if (pregnant && anyMatch(t, LABOR)) cats.push("labor");
  if (anyMatch(t, BITE)) cats.push("bite");
  return { isEmergency: cats.length > 0, categories: cats };
}
