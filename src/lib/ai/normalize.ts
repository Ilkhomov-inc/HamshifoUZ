/**
 * Text normalisation for rule matching across the ways people in Uzbekistan type:
 * Uzbek in Latin script, Uzbek in Cyrillic script, Russian and English.
 */

function base(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[ʻʼ’‘`´]/g, "'")
    .replace(/[^\p{L}\p{N}'\s.,!?-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lowercase, unify apostrophes (oʻ, o', o’ → o'), ё → е, strip symbols, collapse whitespace. */
export function normalizeText(input: string): string {
  return base(input).replace(/ё/g, "е");
}

const CYR_TO_LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh",
  щ: "sh", ъ: "'", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ё: "yo", ў: "o'", қ: "q", ғ: "g'", ҳ: "h",
};
const CYR_VOWELS = "аоуэиеёюяў";

/** Official Uzbek Cyrillic → Latin transliteration (lowercase input). */
export function uzCyrillicToLatin(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (ch === "е") {
      const prev = input[i - 1];
      // "е" is "ye" at the start of a word and after a vowel or ъ/ь, otherwise "e"
      out += !prev || !/\p{L}/u.test(prev) || CYR_VOWELS.includes(prev) || prev === "ъ" || prev === "ь" ? "ye" : "e";
    } else {
      out += CYR_TO_LAT[ch] ?? ch;
    }
  }
  return out;
}

const LAT_DIGRAPHS: Array<[string, string]> = [
  ["o'", "ў"], ["g'", "ғ"], ["sh", "ш"], ["ch", "ч"], ["yo", "ё"], ["yu", "ю"], ["ya", "я"], ["ye", "е"], ["ts", "ц"],
];
const LAT_TO_CYR: Record<string, string> = {
  a: "а", b: "б", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж", k: "к", l: "л", m: "м", n: "н",
  o: "о", p: "п", q: "қ", r: "р", s: "с", t: "т", u: "у", v: "в", x: "х", y: "й", z: "з", "'": "ъ",
};

/** Uzbek Latin → Cyrillic, used to answer people who wrote in Cyrillic in their own script. */
export function uzLatinToCyrillic(input: string): string {
  let out = "";
  const text = input.replace(/[ʻʼ’‘`]/g, "'");
  for (let i = 0; i < text.length; ) {
    const two = text.slice(i, i + 2);
    const lower2 = two.toLowerCase();
    const upper = text[i] !== text[i]!.toLowerCase();
    const wordStart = i === 0 || !/[\p{L}']/u.test(text[i - 1]!);
    const di = LAT_DIGRAPHS.find(([lat]) => lat === lower2);
    let piece: string | undefined;
    let step = 1;
    if (di) {
      piece = di[1];
      step = 2;
    } else {
      const one = text[i]!.toLowerCase();
      piece = one === "e" && wordStart ? "э" : LAT_TO_CYR[one];
    }
    out += piece === undefined ? text[i]! : upper ? piece.toUpperCase() : piece;
    i += step;
  }
  return out;
}

const HAS_CYRILLIC = /[а-яёўқғҳ]/;

/**
 * Text to run rules on. For Cyrillic input it carries BOTH the original (Russian rules match
 * it) and its Uzbek-Latin transliteration (so every Uzbek rule also covers Cyrillic Uzbek),
 * joined by a separator that no rule can match across.
 */
export function matchText(input: string): string {
  const b = base(input);
  const ru = b.replace(/ё/g, "е");
  return HAS_CYRILLIC.test(b) ? `${ru} ¦ ${uzCyrillicToLatin(b)}` : ru;
}

export function anyMatch(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}
