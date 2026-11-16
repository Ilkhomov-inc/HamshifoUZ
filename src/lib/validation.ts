import { z } from "zod";
import { SPECIALTIES } from "./ai/specialties";

export const LOCALES = ["uz", "ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];

import { MAX_NOTE, MAX_PRESCRIPTION, MAX_QUESTION, MAX_SYMPTOMS, normalizePhone } from "./validation-client";

export { MAX_NOTE, MAX_PRESCRIPTION, MAX_QUESTION, MAX_SYMPTOMS, normalizePhone };

const NAME_RE = /^[\p{L}\p{M}'ʻʼ’`.\-]+(?: [\p{L}\p{M}'ʻʼ’`.\-]+)*$/u;

export const nameSchema = z
  .string()
  .transform((s) => s.trim().replace(/\s+/g, " "))
  .pipe(z.string().min(2).max(80).regex(NAME_RE));

export const phoneSchema = z
  .string()
  .max(32)
  .transform((s, ctx) => {
    const p = normalizePhone(s);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "phone" });
      return z.NEVER;
    }
    return p;
  });

const cleanText = (max: number, min = 0) =>
  z
    .string()
    .max(max * 2) // raw cap before trimming
    .transform((s) => s.replace(/\u0000/g, "").trim())
    .pipe(z.string().min(min).max(max));

export const symptomsSchema = cleanText(MAX_SYMPTOMS, 3);
export const localeSchema = z.enum(LOCALES).catch("uz");
export const specialtySchema = z.enum(SPECIALTIES);

export const routeRequestSchema = z.object({
  text: symptomsSchema,
  locale: localeSchema,
  /** The patient's answer to Hamdard's one clarifying question. */
  clarifications: z
    .array(z.object({ q: cleanText(200, 1), a: cleanText(200, 1) }))
    .max(2)
    .optional(),
});

export const bookingRequestSchema = z.object({
  slotId: z.uuid(),
  name: nameSchema,
  phone: phoneSchema,
  symptoms: cleanText(MAX_SYMPTOMS).optional().default(""),
  aiSpecialty: specialtySchema.nullish(),
  aiUrgency: z.enum(["routine", "soon", "emergency"]).nullish(),
  consent: z.literal(true),
});

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_B64 = 4_000_000; // ≈3 MB binary

export const explainRequestSchema = z
  .object({
    locale: localeSchema,
    appointmentId: z.uuid().optional(),
    text: cleanText(MAX_PRESCRIPTION).optional(),
    image: z
      .object({
        mediaType: z.enum(IMAGE_TYPES),
        data: z.string().max(MAX_IMAGE_B64).regex(/^[A-Za-z0-9+/]+={0,2}$/),
      })
      .optional(),
    question: cleanText(MAX_QUESTION).optional(),
    /** Earlier exchanges of this chat (context for short follow-ups). Treated as untrusted data. */
    history: z
      .array(z.object({ q: cleanText(MAX_QUESTION, 1), a: cleanText(1200, 1) }))
      .max(3)
      .optional(),
  })
  .refine((v) => Boolean(v.appointmentId || (v.text && v.text.length >= 3) || v.image), {
    message: "source required",
  });

export const noteRequestSchema = z.object({
  recommendations: cleanText(MAX_NOTE, 1),
  status: z.enum(["completed", "booked", "no_show"]).optional().default("completed"),
});

export const waitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.email()),
  consent: z.literal(true),
  locale: localeSchema,
  // honeypot — real users never fill it
  company: z.string().max(0).optional().default(""),
});

export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
