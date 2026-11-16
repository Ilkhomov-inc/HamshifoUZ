import { matchText, uzLatinToCyrillic } from "./normalize";
import type { ReplyLanguage } from "./language";
import type { Locale } from "../time";

/**
 * Reads the dosing lines of a doctor's typed note into a simple daily schedule.
 *
 * No model involved: it only reports what the patterns literally found (times a day, every N
 * hours, before/after food, number of days, follow-up visit) and always carries the doctor's
 * original line next to it. Anything it cannot read is left as plain text, never guessed.
 * Used for the "daily schedule" card and for a basic explanation when the AI is unavailable.
 */

export type DaySlot = "morning" | "noon" | "evening" | "night";
export type ScheduleItem = {
  /** The doctor's line, verbatim (trimmed). */
  line: string;
  timesPerDay: number | null;
  everyHours: number | null;
  days: number | null;
  meal: "before" | "after" | "with" | null;
  /** Times of day: as written, or the usual spread for 2–4 times a day. */
  slots: DaySlot[];
};
export type Schedule = { items: ScheduleItem[]; followUpDays: number | null; other: string[] };

const WORD_NUM: Record<string, number> = {
  bir: 1, ikki: 2, uch: 3, "to'rt": 4, tort: 4,
  один: 1, одну: 1, два: 2, две: 2, три: 3, четыре: 4,
  once: 1, twice: 2, three: 3, four: 4,
};

function timesPerDay(t: string): number | null {
  const m =
    t.match(/(\d)\s*(mahal|marta|marotaba)/) ??
    t.match(/(\d)\s*(?:раза?|р\.?)\s*(?:в день|в сутки|\/\s*д|\/\s*сут)/) ??
    t.match(/(\d)\s*(?:times|x)\s*(?:a|per|\/)\s*day/);
  if (m) return Number(m[1]);
  const w =
    t.match(/(bir|ikki|uch|to'?rt)\s*(mahal|marta)/) ??
    t.match(/(один|одну|два|две|три|четыре)\s*раза?\s*в (?:день|сутки)/) ??
    t.match(/(once|twice|three|four)(?: times)? (?:a|per) day|(once|twice) daily/);
  if (w) return WORD_NUM[(w[1] ?? w[2] ?? "").replace("'", "'")] ?? null;
  if (/дважды в (день|сутки)/.test(t)) return 2;
  if (/трижды в (день|сутки)/.test(t)) return 3;
  if (/(^|\s)раз в (день|сутки)|(^|\s)daily(?=$|[\s.,])/.test(t)) return 1;
  return null;
}

function everyHours(t: string): number | null {
  const m = t.match(/har\s*(\d{1,2})\s*soat/) ?? t.match(/кажды[ей]\s*(\d{1,2})\s*час/) ?? t.match(/every\s*(\d{1,2})\s*(?:hours?|hrs?)/);
  return m ? Number(m[1]) : null;
}

/** How long to take it. "After N days" / "in N days" is a follow-up, not a duration. */
function durationDays(t: string): number | null {
  for (const m of t.matchAll(/(\d{1,3})\s*kun(\S*)/g)) if (!/^(iga|dan|lik)/.test(m[2] ?? "")) return Number(m[1]);
  for (const m of t.matchAll(/(\d)\s*hafta(\S*)/g)) if (!/^dan/.test(m[2] ?? "")) return Number(m[1]) * 7;
  for (const m of t.matchAll(/(через\s+)?(\d{1,3})\s*(?:дней|дня|день|дн(?=$|[\s.,)])|суток)/g)) if (!m[1]) return Number(m[2]);
  for (const m of t.matchAll(/(через\s+)?(\d)\s*недел/g)) if (!m[1]) return Number(m[2]) * 7;
  for (const m of t.matchAll(/(in\s+|after\s+)?(\d{1,3})\s*days?/g)) if (!m[1]) return Number(m[2]);
  for (const m of t.matchAll(/(in\s+|after\s+)?(\d)\s*weeks?/g)) if (!m[1]) return Number(m[2]) * 7;
  return null;
}

function followUp(t: string): number | null {
  if (!/nazorat|ko'?rik|qayta|kel(ing|ish)|qabul|контрол|повторн|осмотр|прийти|прием|явк|come back|follow|check|review|return/.test(t)) return null;
  let m = t.match(/(\d{1,3})\s*kundan (?:keyin|so'?ng)/) ?? t.match(/через\s+(\d{1,3})\s*(?:дней|дня|день|дн)/) ?? t.match(/(?:in|after)\s+(\d{1,3})\s*days?/);
  if (m) return Number(m[1]);
  m = t.match(/(\d)\s*haftadan (?:keyin|so'?ng)/) ?? t.match(/через\s+(\d)\s*недел/) ?? t.match(/(?:in|after)\s+(\d)\s*weeks?/);
  if (m) return Number(m[1]) * 7;
  if (/bir haftadan (keyin|so'?ng)|через неделю|(in|after) a week/.test(t)) return 7;
  return null;
}

function meal(t: string): ScheduleItem["meal"] {
  if (/ovqatdan keyin|после еды|after (a |the )?(meal|food|eating)/.test(t)) return "after";
  if (/ovqatdan oldin|och qoringa|nahorga|до еды|перед едой|натощак|before (a |the )?(meal|food|eating)|empty stomach/.test(t)) return "before";
  if (/ovqat (bilan|paytida|vaqtida)|во время еды|с едой|with (a |the )?(meal|food)/.test(t)) return "with";
  return null;
}

function explicitSlots(t: string): DaySlot[] {
  const out: DaySlot[] = [];
  if (/ertalab|утр|morning/.test(t)) out.push("morning");
  if (/tush(da|lik)|kunduzi|днем|в обед|noon|midday|afternoon|lunch/.test(t)) out.push("noon");
  if (/kechqurun|kechki|вечер|evening/.test(t)) out.push("evening");
  if (/yotishdan oldin|uxlashdan oldin|kechasi|tunda|на ночь|перед сном|ночью|bedtime|at night|before bed/.test(t)) out.push("night");
  return out;
}

const USUAL: Record<number, DaySlot[]> = { 2: ["morning", "evening"], 3: ["morning", "noon", "evening"], 4: ["morning", "noon", "evening", "night"] };

export function parseSchedule(text: string | undefined | null): Schedule {
  const items: ScheduleItem[] = [];
  const other: string[] = [];
  let followUpDays: number | null = null;

  const lines = (text ?? "")
    .split(/\n+/)
    .map((x) => x.replace(/^\s*(\d{1,2}[.)]|[-•*–])\s*/, "").trim())
    .filter(Boolean);

  for (const line of lines) {
    const t = matchText(line);
    const fu = followUp(t);
    if (fu !== null && followUpDays === null) followUpDays = fu;

    let times = timesPerDay(t);
    const every = everyHours(t);
    if (times !== null && (times < 1 || times > 6)) times = null;
    if (times === null && every !== null && 24 % every === 0 && 24 / every <= 6) times = 24 / every;
    const said = explicitSlots(t);

    if ((times !== null || every !== null) && items.length < 8) {
      items.push({
        line: line.slice(0, 200),
        timesPerDay: times,
        everyHours: every,
        days: durationDays(t),
        meal: meal(t),
        slots: said.length ? said : times !== null ? (USUAL[times] ?? []) : [],
      });
    } else if (fu === null && !(line.endsWith(":") && line.length < 40)) {
      other.push(line.slice(0, 200)); // short "Recommendations:" style headings are dropped
    }
  }
  return { items, followUpDays, other: other.slice(0, 8) };
}

// ── Basic explanation without the model ─────────────────────────────────
type Words = {
  intro: string;
  how: string;
  back: string;
  rest: string;
  note: string;
  slot: Record<DaySlot, string>;
  meal: Record<NonNullable<ScheduleItem["meal"]>, string>;
  times: (n: number) => string;
  every: (h: number) => string;
  days: (d: number) => string;
  backIn: (d: number) => string;
};

const WORDS: Record<Locale, Words> = {
  uz: {
    intro: "Shifokoringiz yozganlari qisqacha:",
    how: "Qanday qabul qilish kerak:",
    back: "Qachon qayta kelish kerak:",
    rest: "Boshqa ko'rsatmalar:",
    note: "Hamdard AI hozir ulanmagan, shuning uchun bu shifokor yozuvidan avtomatik tuzilgan qisqa izoh. Savollaringiz bo'lsa, shifokoringizdan so'rang.",
    slot: { morning: "ertalab", noon: "tushda", evening: "kechqurun", night: "yotishdan oldin" },
    meal: { before: "ovqatdan oldin", after: "ovqatdan keyin", with: "ovqat bilan birga" },
    times: (n) => `kuniga **${n} mahal**`,
    every: (h) => `har ${h} soatda`,
    days: (d) => `**${d} kun** davomida`,
    backIn: (d) => `**${d} kundan keyin** nazorat ko'rigiga.`,
  },
  ru: {
    intro: "Назначения врача кратко:",
    how: "Как принимать:",
    back: "Когда прийти снова:",
    rest: "Другие указания:",
    note: "Hamdard AI сейчас не подключён, поэтому это краткая автоматическая выжимка из записи врача. Если есть вопросы, спросите у врача.",
    slot: { morning: "утром", noon: "днём", evening: "вечером", night: "перед сном" },
    meal: { before: "до еды", after: "после еды", with: "во время еды" },
    times: (n) => `**${n} ${n === 1 ? "раз" : n < 5 ? "раза" : "раз"} в день**`,
    every: (h) => `каждые ${h} ч`,
    days: (d) => `**${d} дн.**`,
    backIn: (d) => `Через **${d} дн.** на контрольный осмотр.`,
  },
  en: {
    intro: "Your doctor's instructions in short:",
    how: "How to take it:",
    back: "When to come back:",
    rest: "Other instructions:",
    note: "Hamdard AI is not connected right now, so this is a short automatic summary of the doctor's note. If you have questions, ask your doctor.",
    slot: { morning: "morning", noon: "midday", evening: "evening", night: "bedtime" },
    meal: { before: "before food", after: "after food", with: "with food" },
    times: (n) => (n === 1 ? "**once a day**" : n === 2 ? "**twice a day**" : `**${n} times a day**`),
    every: (h) => `every ${h} hours`,
    days: (d) => `for **${d} days**`,
    backIn: (d) => `In **${d} days** for a check-up.`,
  },
};

/** A plain summary built from the schedule alone. The doctor's own lines are kept verbatim. */
export function basicExplanation(text: string, lang: ReplyLanguage): string {
  const s = parseSchedule(text);
  const w = WORDS[lang.locale];
  const out: string[] = [w.intro];
  if (s.items.length) {
    out.push("", w.how);
    for (const it of s.items) {
      const bits: string[] = [];
      if (it.timesPerDay !== null) bits.push(it.slots.length ? `${w.times(it.timesPerDay)} (${it.slots.map((x) => w.slot[x]).join(", ")})` : w.times(it.timesPerDay));
      if (it.everyHours !== null) bits.push(w.every(it.everyHours));
      if (it.meal) bits.push(w.meal[it.meal]);
      if (it.days !== null) bits.push(w.days(it.days));
      out.push(`- ${it.line}`, `- → ${bits.join("; ")}.`);
    }
  }
  if (s.followUpDays !== null) out.push("", w.back, `- ${w.backIn(s.followUpDays)}`);
  if (s.other.length) out.push("", s.items.length || s.followUpDays !== null ? w.rest : "", ...s.other.map((x) => `- ${x}`));
  out.push("", w.note);
  const joined = out.join("\n").replace(/\n{3,}/g, "\n\n");
  // The doctor's own lines stay as written; only Hamdard's words follow the patient's script.
  return lang.locale === "uz" && lang.script === "cyrillic" ? joined.split("\n").map((l) => (s.items.some((i) => l === `- ${i.line}`) || s.other.some((o) => l === `- ${o}`) ? l : uzLatinToCyrillic(l))).join("\n") : joined;
}
