/** Client-safe validation helpers (no zod → smaller browser bundle). */
export const MAX_SYMPTOMS = 1500;
export const MAX_PRESCRIPTION = 1500;
export const MAX_QUESTION = 500;
export const MAX_NOTE = 4000;

/** Normalizes Uzbek phone numbers to +998XXXXXXXXX. Returns null if invalid. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-().]/g, "");
  const intl = digits.startsWith("+");
  let d = intl ? digits.slice(1) : digits;
  if (!/^\d+$/.test(d)) return null;
  // A bare 9-digit local number gets the country code; "+998 90 123 4" is just incomplete, not a local number.
  if (d.length === 9 && !intl) d = `998${d}`;
  if (d.length !== 12 || !d.startsWith("998")) return null;
  return `+${d}`;
}

/** Live mask for the phone field: always "+998 " then "XX XXX XX XX" as digits are typed or pasted. */
export function formatPhoneInput(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("998")) d = d.slice(3);
  d = d.slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return `+998 ${parts.join(" ")}`.trimEnd() + (parts.length ? "" : " ");
}
