import { detectEmergency } from "@/lib/ai/emergency";
import { keywordRoute } from "@/lib/ai/keyword-router";
import { detectSeriousQuestion } from "@/lib/ai/serious";
import type { Specialty } from "@/lib/ai/specialties";
import {
  EMERGENCY_NO,
  EMERGENCY_NO_FRESH,
  EMERGENCY_NO_ROUND2,
  EMERGENCY_YES_FRESH,
  ROUTING_FRESH,
  EMERGENCY_YES,
  EMERGENCY_YES_ROUND2,
  ROUTING,
  ROUTING_ROUND2,
  SERIOUS_NO,
  SERIOUS_YES,
  type Lang,
  type RoutingCase,
} from "./cases";

export type Miss = { lang: Lang; text: string; got: string; want: string };
export type Score = { total: number; correct: number; misses: Miss[]; byLang: Record<Lang, { total: number; correct: number }> };

function tally(rows: Array<{ lang: Lang; text: string; ok: boolean; got: string; want: string }>): Score {
  const byLang = { uz: { total: 0, correct: 0 }, uzc: { total: 0, correct: 0 }, ru: { total: 0, correct: 0 }, en: { total: 0, correct: 0 } };
  const misses: Miss[] = [];
  for (const r of rows) {
    byLang[r.lang].total++;
    if (r.ok) byLang[r.lang].correct++;
    else misses.push({ lang: r.lang, text: r.text, got: r.got, want: r.want });
  }
  return { total: rows.length, correct: rows.length - misses.length, misses, byLang };
}

const uiLocale = (lang: Lang) => (lang === "uzc" ? "uz" : lang);

/** Scores a symptom → specialty function against the labelled routing set. */
export function scoreRouting(route: (text: string, lang: Lang) => Specialty, cases: RoutingCase[] = ROUTING): Score {
  return tally(
    cases.map(([lang, text, want, also = []]) => {
      const got = route(text, lang);
      return { lang, text, ok: got === want || also.includes(got), got, want };
    }),
  );
}

/** Offline layer: what Hamdard does with no model at all (and before any model call). */
export function scoreOffline() {
  return {
    routing: scoreRouting((text, lang) => keywordRoute(text, uiLocale(lang)).specialty),
    emergencyCaught: tally(EMERGENCY_YES.map(([lang, text]) => ({ lang, text, ok: detectEmergency(text).isEmergency, got: "missed", want: "103" }))),
    emergencyQuiet: tally(
      EMERGENCY_NO.map(([lang, text]) => {
        const r = detectEmergency(text);
        return { lang, text, ok: !r.isEmergency, got: `false alarm: ${r.categories.join(",")}`, want: "no alarm" };
      }),
    ),
    seriousCaught: tally(SERIOUS_YES.map(([lang, text]) => ({ lang, text, ok: detectSeriousQuestion(text).length > 0, got: "answered", want: "doctor" }))),
    seriousQuiet: tally(
      SERIOUS_NO.map(([lang, text]) => {
        const t = detectSeriousQuestion(text);
        return { lang, text, ok: t.length === 0, got: `escalated: ${t.join(",")}`, want: "answer" };
      }),
    ),
  };
}

export const pct = (s: Score) => `${s.correct}/${s.total} (${Math.round((s.correct / s.total) * 100)}%)`;

/** The second development set (see cases.ts). */
export function scoreRound2() {
  return {
    routing: scoreRouting((text, lang) => keywordRoute(text, uiLocale(lang)).specialty, ROUTING_ROUND2),
    emergencyCaught: tally(EMERGENCY_YES_ROUND2.map(([lang, text]) => ({ lang, text, ok: detectEmergency(text).isEmergency, got: "missed", want: "103" }))),
    emergencyQuiet: tally(
      EMERGENCY_NO_ROUND2.map(([lang, text]) => {
        const r = detectEmergency(text);
        return { lang, text, ok: !r.isEmergency, got: `false alarm: ${r.categories.join(",")}`, want: "no alarm" };
      }),
    ),
  };
}

/** Held-out phrases: never used to adjust a rule. The honest estimate. */
export function scoreFresh() {
  return {
    routing: scoreRouting((text, lang) => keywordRoute(text, uiLocale(lang)).specialty, ROUTING_FRESH),
    emergencyCaught: tally(EMERGENCY_YES_FRESH.map(([lang, text]) => ({ lang, text, ok: detectEmergency(text).isEmergency, got: "missed", want: "103" }))),
    emergencyQuiet: tally(
      EMERGENCY_NO_FRESH.map(([lang, text]) => {
        const r = detectEmergency(text);
        return { lang, text, ok: !r.isEmergency, got: `false alarm: ${r.categories.join(",")}`, want: "no alarm" };
      }),
    ),
  };
}
