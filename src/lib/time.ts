/** Uzbekistan uses a fixed UTC+05:00 offset (no DST). */
export const TZ = "Asia/Tashkent";
export const TZ_OFFSET = "+05:00";

export type Locale = "uz" | "ru" | "en";

export const intlLocale: Record<Locale, string> = { uz: "uz-Latn-UZ", ru: "ru-RU", en: "en-GB" };

/** YYYY-MM-DD of the given instant in Tashkent. */
export function dateKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    date,
  );
}

/** Midnight (Tashkent) of a YYYY-MM-DD key as a Date. */
export function startOfDay(key: string): Date {
  return new Date(`${key}T00:00:00${TZ_OFFSET}`);
}

export function addDays(key: string, days: number): string {
  const d = startOfDay(key);
  d.setUTCDate(d.getUTCDate() + days);
  return dateKey(d);
}

/** ISO weekday 1..7 for a date key. */
export function isoWeekday(key: string): number {
  const d = new Date(`${key}T12:00:00${TZ_OFFSET}`).getUTCDay();
  return d === 0 ? 7 : d;
}

export function startOfWeek(key: string): string {
  return addDays(key, 1 - isoWeekday(key));
}

export function formatTime(d: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(
    typeof d === "string" ? new Date(d) : d,
  );
}

/* Browsers ship incomplete Uzbek CLDR data (e.g. "M11", "Mon"), so Uzbek names are built in. */
const UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const UZ_MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const UZ_WEEKDAYS = ["dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba", "yakshanba"];
const UZ_WEEKDAYS_SHORT = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

function tzParts(d: Date) {
  const key = dateKey(d);
  const [y, m, day] = key.split("-").map(Number) as [number, number, number];
  return { y, m, day, wd: isoWeekday(key) };
}

export function monthName(month: number, locale: Locale, style: "long" | "short" = "long"): string {
  if (locale === "uz") return (style === "long" ? UZ_MONTHS : UZ_MONTHS_SHORT)[month - 1]!;
  return new Intl.DateTimeFormat(intlLocale[locale], { month: style, timeZone: "UTC" }).format(new Date(Date.UTC(2024, month - 1, 15)));
}

/** ISO weekday 1 (Mon) .. 7 (Sun). */
export function weekdayName(wd: number, locale: Locale, style: "long" | "short" = "long"): string {
  if (locale === "uz") return (style === "long" ? UZ_WEEKDAYS : UZ_WEEKDAYS_SHORT)[wd - 1]!;
  return new Intl.DateTimeFormat(intlLocale[locale], { weekday: style, timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, wd)));
}

type DateOpts = { weekday?: "long" | "short"; month?: "long" | "short"; day?: "numeric"; year?: "numeric" };

export function formatDate(d: Date | string, locale: Locale, opts: DateOpts = {}): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const o = { weekday: "long", day: "numeric", month: "long", ...opts } as DateOpts;
  if ("weekday" in opts && opts.weekday === undefined) delete o.weekday;
  if ("month" in opts && opts.month === undefined) delete o.month;
  if (locale !== "uz") {
    return new Intl.DateTimeFormat(intlLocale[locale], { timeZone: TZ, ...o }).format(date);
  }
  const p = tzParts(date);
  const dm = o.month ? `${p.day}-${monthName(p.m, "uz", o.month)}` : String(p.day);
  const withYear = o.year ? `${p.y}-yil ${dm}` : dm;
  return o.weekday ? `${withYear}, ${weekdayName(p.wd, "uz", o.weekday)}` : withYear;
}

export function formatDateKey(key: string, locale: Locale, opts: DateOpts = {}): string {
  return formatDate(new Date(`${key}T12:00:00${TZ_OFFSET}`), locale, opts);
}

export function monthTitle(ym: string, locale: Locale): string {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  if (locale === "uz") return `${UZ_MONTHS[m - 1]} ${y}`;
  return new Intl.DateTimeFormat(intlLocale[locale], { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15)));
}

/** +998XXXXXXXXX → +998 XX XXX XX XX */
export function formatPhone(p: string): string {
  const m = p.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p;
}
