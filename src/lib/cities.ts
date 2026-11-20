/**
 * Cities with demo polyclinics: every regional centre of Uzbekistan plus the larger towns.
 * The slug is stored in hs.clinics.city (see migrations/002_all_cities.sql).
 */
export const CITY_LIST = [
  { slug: "tashkent", uz: "Toshkent", ru: "Ташкент", en: "Tashkent" },
  { slug: "nurafshon", uz: "Nurafshon", ru: "Нурафшан", en: "Nurafshon" },
  { slug: "chirchiq", uz: "Chirchiq", ru: "Чирчик", en: "Chirchiq" },
  { slug: "angren", uz: "Angren", ru: "Ангрен", en: "Angren" },
  { slug: "olmaliq", uz: "Olmaliq", ru: "Алмалык", en: "Almalyk" },
  { slug: "andijan", uz: "Andijon", ru: "Андижан", en: "Andijan" },
  { slug: "namangan", uz: "Namangan", ru: "Наманган", en: "Namangan" },
  { slug: "fergana", uz: "Farg'ona", ru: "Фергана", en: "Fergana" },
  { slug: "margilan", uz: "Marg'ilon", ru: "Маргилан", en: "Margilan" },
  { slug: "kokand", uz: "Qo'qon", ru: "Коканд", en: "Kokand" },
  { slug: "samarkand", uz: "Samarqand", ru: "Самарканд", en: "Samarkand" },
  { slug: "bukhara", uz: "Buxoro", ru: "Бухара", en: "Bukhara" },
  { slug: "navoi", uz: "Navoiy", ru: "Навои", en: "Navoi" },
  { slug: "karshi", uz: "Qarshi", ru: "Карши", en: "Karshi" },
  { slug: "shahrisabz", uz: "Shahrisabz", ru: "Шахрисабз", en: "Shahrisabz" },
  { slug: "termez", uz: "Termiz", ru: "Термез", en: "Termez" },
  { slug: "jizzakh", uz: "Jizzax", ru: "Джизак", en: "Jizzakh" },
  { slug: "gulistan", uz: "Guliston", ru: "Гулистан", en: "Gulistan" },
  { slug: "urgench", uz: "Urganch", ru: "Ургенч", en: "Urgench" },
  { slug: "khiva", uz: "Xiva", ru: "Хива", en: "Khiva" },
  { slug: "nukus", uz: "Nukus", ru: "Нукус", en: "Nukus" },
] as const;

export type City = (typeof CITY_LIST)[number]["slug"];

export const CITIES = CITY_LIST.map((c) => c.slug) as [City, ...City[]];

export function cityNames(locale: "uz" | "ru" | "en"): Record<string, string> {
  return Object.fromEntries(CITY_LIST.map((c) => [c.slug, c[locale]]));
}
