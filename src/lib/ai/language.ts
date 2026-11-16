import type { Locale } from "../time";

export type Script = "latin" | "cyrillic";
export type ReplyLanguage = { locale: Locale; script: Script };

const count = (text: string, re: RegExp) => (text.match(re) ?? []).length;

const UZ_CYR = /яп(ти|ман|сиз|миз)?|(^|\s)(бор|йўқ|йук|билан|учун|ҳам|хам|керак|бери|жуда|мен|менда|менинг|қандай|кандай)(?=$|[\s.,!?])|оғри|огри|кундан|бўл|бул(ди|япти)|қил|ёш(да|ли)|иситма|ҳарорат|харорат|йўтал|йутал/g;
const RU = /(^|\s)(у меня|меня|мне|что|как|есть|нет|это|при|или|очень|после|когда|уже|день|дня|дней|болит|болят|можно|нужно|третий|второй)(?=$|[\s.,!?])|[ыщ]|ь(?=$|[\s.,!?])|ться|ение|ость/g;
const UZ_LAT = /yap(ti|man|siz|miz)|moqda|(^|\s)(bor|yo'?q|bilan|uchun|ham|kerak|beri|juda|men|menda|mening|qanday|va|kun|nima)(?=$|[\s.,!?])|og'?ri|kundan|bo'?l|qil(ib|di|yap)|yosh(da|li)|isitma|harorat|yo'?tal|[og]'|im(?=$|[\s.,!?])/g;
const EN = /(^|\s)(i|my|the|and|have|has|had|is|are|am|of|for|with|when|after|it|me|a|an|not|can|should|do|does|how|what|feel|pain|hurts?|days?|weeks?)(?=$|[\s.,!?])/g;

/**
 * Works out which language (and script) a patient wrote in, so Hamdard answers the same way.
 * Falls back to the interface language when the text is too short or ambiguous.
 */
export function detectLanguage(raw: string | undefined | null, fallback: Locale): ReplyLanguage {
  const text = (raw ?? "").toLowerCase().replace(/[ʻʼ’‘`´]/g, "'");
  const cyr = count(text, /[а-яёўқғҳ]/g);
  const lat = count(text, /[a-z]/g);
  const byDefault: ReplyLanguage = { locale: fallback, script: fallback === "ru" ? "cyrillic" : "latin" };
  if (cyr + lat < 4) return byDefault;

  if (cyr >= lat) {
    const uz = count(text, UZ_CYR) + (/[ўқғҳ]/.test(text) ? 3 : 0);
    const ru = count(text, RU);
    if (uz > ru) return { locale: "uz", script: "cyrillic" };
    if (ru > uz) return { locale: "ru", script: "cyrillic" };
    return fallback === "uz" ? { locale: "uz", script: "cyrillic" } : { locale: "ru", script: "cyrillic" };
  }
  const uz = count(text, UZ_LAT);
  const en = count(text, EN);
  if (uz > en) return { locale: "uz", script: "latin" };
  if (en > uz) return { locale: "en", script: "latin" };
  return fallback === "en" ? { locale: "en", script: "latin" } : fallback === "uz" ? { locale: "uz", script: "latin" } : byDefault;
}
