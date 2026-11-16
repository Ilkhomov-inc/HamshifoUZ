/** Client-safe validation helpers (no zod → smaller browser bundle). */
export const MAX_SYMPTOMS = 1500;
export const MAX_PRESCRIPTION = 1500;
export const MAX_QUESTION = 500;
export const MAX_NOTE = 4000;

/** Normalizes Uzbek phone numbers to +998XXXXXXXXX. Returns null if invalid. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-().]/g, "");
  let d = digits.startsWith("+") ? digits.slice(1) : digits;
  if (!/^\d+$/.test(d)) return null;
  if (d.length === 9) d = `998${d}`;
  if (d.length !== 12 || !d.startsWith("998")) return null;
  return `+${d}`;
}
