import { matchText } from "./normalize";

/**
 * Deterministic detector for prescription questions that must go to a doctor
 * (side effects, pregnancy, interactions, worsening, allergies, other
 * people's doses, missed/extra doses, stopping). Independent of the model:
 * when it fires, the UI always shows the "needs a doctor" actions.
 */

export type SeriousTopic =
  | "side_effects"
  | "pregnancy"
  | "interactions"
  | "worsening"
  | "allergy"
  | "other_person"
  | "dose_change";

const RULES: Record<SeriousTopic, RegExp[]> = {
  side_effects: [/nojo'?ya|yon ta'?sir|ta'?siri yomon/, /побочн/, /side[ -]?effect|adverse/],
  pregnancy: [/homilador|emiz|ko'?krak suti/, /беремен|кормлю грудью|кормящ|лактац|грудное вскармливание/, /pregnan|breastfeed|nursing/],
  interactions: [
    /boshqa dori|birga ich|alkogol|spirtli|ichkilik|aroq|pivo/,
    /совмест|вместе с|одновременно с|алкогол|спиртн|пиво|водк/,
    /interact|together with|combine|alcohol|beer|wine|at the same time/,
    /(take|use|have|drink) (it|them|this|these|that) with (?!(a |some |the )?(food|meal|water|milk|breakfast|lunch|dinner))/,
    /with (ibuprofen|aspirin|paracetamol|antibiotics?|painkillers?|other (medicines?|medications?|pills|drugs|tablets))/,
  ],
  worsening: [/yomonlash|kuchay|battar|o'?tmayap|yaxshilanmay/, /ухудш|хуже|не проходит|не помогает/, /worse|worsen|not (getting )?better|not helping/],
  allergy: [/allergi/, /аллерги/, /allerg/],
  other_person: [/bolaga|bolamga|farzandimga|onamga|otamga|erimga|xotinimga/, /ребенку|ребёнку|детям|маме|папе|мужу|жене/, /my (child|kid|son|daughter|mother|father|husband|wife)|for a child/],
  dose_change: [
    /ko'?p ichib|ikki baravar|unut|esdan chiq|o'?tkazib yubor|to'?xtatsam|to'?xtatib|kamaytir|ko'?paytir|oshirsam|oshirib|dozani (o'?zgartir|oshir)|ikkita(sini)? (birdan )?ich/,
    /пропустил|забыл|двойн|передозир|бросить|прекратить|уменьшить дозу|увеличить дозу/,
    /missed|forgot|skip(ped)? (a |the |my )?dose|double|overdose|stop taking|reduce the dose|increase the dose|change the dose/,
    /(take|took) (two|2|both|extra|more)|two at once|at once/,
  ],
};

export function detectSeriousQuestion(raw: string | undefined | null): SeriousTopic[] {
  if (!raw) return [];
  const t = matchText(raw);
  return (Object.keys(RULES) as SeriousTopic[]).filter((k) => RULES[k].some((p) => p.test(t)));
}
