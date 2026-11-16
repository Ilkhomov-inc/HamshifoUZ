import { z } from "zod";
import { SPECIALTIES } from "./specialties";

const ALTERNATIVES = [...SPECIALTIES, "none"] as const;

/**
 * Shape requested from the model via structured outputs. Deliberately limited to strings,
 * enums and string arrays (no nullable/optional fields): "none", "" and [] mean "nothing".
 */
export const RouterApiSchema = z.object({
  specialty: z.enum(SPECIALTIES),
  confidence: z.enum(["low", "medium", "high"]),
  reason_short: z.string(),
  urgency: z.enum(["routine", "soon", "emergency"]),
  follow_up_questions: z.array(z.string()),
  alternative: z.enum(ALTERNATIVES),
  understood: z.array(z.string()),
  clarifying_question: z.string(),
  quick_replies: z.array(z.string()),
});

const shortList = (maxItems: number, maxLen: number) =>
  z
    .array(z.string())
    .catch([])
    .transform((items) =>
      items
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length <= maxLen)
        .slice(0, maxItems),
    );

/**
 * App-side validation of whatever came back. The five core fields are strict: a bad value
 * rejects the whole answer (retry, then keyword fallback). The four helper fields are
 * optional extras, so a missing or malformed one is dropped rather than failing the answer.
 */
export const RouterOutputSchema = z.object({
  specialty: z.enum(SPECIALTIES),
  confidence: z.enum(["low", "medium", "high"]),
  reason_short: z.string().trim().min(1).max(320),
  urgency: z.enum(["routine", "soon", "emergency"]),
  follow_up_questions: z.array(z.string().trim().min(1).max(200)).max(3),
  alternative: z.enum(ALTERNATIVES).catch("none"),
  understood: shortList(4, 60),
  clarifying_question: z
    .string()
    .catch("")
    .transform((s) => (s.trim().length <= 200 ? s.trim() : "")),
  quick_replies: shortList(6, 40),
});

export type RouterOutput = z.infer<typeof RouterOutputSchema>;

/** Validates raw model output. Light normalization only (no silent repair of bad core values). */
export function validateRouterOutput(raw: unknown): RouterOutput | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  const parsed = RouterOutputSchema.safeParse(value);
  if (!parsed.success) return null;
  const out = parsed.data;
  if (out.alternative === out.specialty) out.alternative = "none";
  if (!out.clarifying_question) out.quick_replies = [];
  return out;
}
