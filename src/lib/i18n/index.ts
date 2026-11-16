import uz, { type Dict } from "./uz";
import ru from "./ru";
import en from "./en";
import type { Locale } from "../time";

export type { Dict };
export const dictionaries: Record<Locale, Dict> = { uz, ru, en };

/** Replaces {name} placeholders. */
export function fmt(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}
