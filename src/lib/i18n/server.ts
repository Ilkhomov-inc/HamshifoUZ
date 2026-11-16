import "server-only";
import { cookies } from "next/headers";
import { dictionaries } from ".";
import type { Locale } from "../time";

export const LOCALE_COOKIE = "hs_locale";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return v === "ru" || v === "en" ? v : "uz";
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
