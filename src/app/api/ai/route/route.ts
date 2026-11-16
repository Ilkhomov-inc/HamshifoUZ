import { routeSymptoms } from "@/lib/ai/router";
import { aiDailyBudget, aiRateLimit } from "@/lib/ai/limits";
import { getCurrentUser } from "@/lib/auth/session";
import { apiError, isSameOrigin, logEvent, readJson } from "@/lib/security";
import { routeRequestSchema } from "@/lib/validation";

export const maxDuration = 30;

/** Symptom → specialty routing. Receives ONLY symptom text (no name/phone/email). */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return apiError("bad_origin", 403);
  const user = await getCurrentUser();
  if ((await aiRateLimit(req, user?.id ?? null, "route")) === "limited") return apiError("rate_limited", 429);

  const body = await readJson(req, 8_000);
  if (body instanceof Response) return body;
  const parsed = routeRequestSchema.safeParse(body);
  if (!parsed.success) return apiError("validation", 400);

  const started = Date.now();
  const budgetOk = await aiDailyBudget();
  const r = await routeSymptoms(parsed.data.text, parsed.data.locale, {
    signal: req.signal,
    skipModel: !budgetOk,
    clarifications: parsed.data.clarifications,
  });
  logEvent("ai.route", {
    ms: Date.now() - started,
    source: r.source,
    attempts: r.attempts,
    specialty: r.result.specialty,
    urgency: r.result.urgency,
    emergency: r.emergency.isEmergency,
    lang: `${r.lang.locale}-${r.lang.script}`,
    round: parsed.data.clarifications?.length ? 2 : 1,
    asked: Boolean(r.result.clarifying_question),
  });
  return Response.json({ emergency: r.emergency, result: r.result, source: r.source, lang: r.lang });
}
