import { explain, type ExplainEvent } from "@/lib/ai/explainer";
import { aiDailyBudget, aiRateLimit } from "@/lib/ai/limits";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppointment } from "@/lib/data/appointments";
import { apiError, isSameOrigin, readJson } from "@/lib/security";
import { explainRequestSchema } from "@/lib/validation";

export const maxDuration = 60;

/**
 * Plain-language prescription explainer, streamed as NDJSON.
 * For a post-visit explanation the server loads the doctor's note itself
 * (under RLS), so the client can't substitute another text or appointment.
 * Images are processed in memory only and never stored.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return apiError("bad_origin", 403);
  const user = await getCurrentUser();
  if ((await aiRateLimit(req, user?.id ?? null, "explain")) === "limited") return apiError("rate_limited", 429);

  const body = await readJson(req, 4_400_000);
  if (body instanceof Response) return body;
  const parsed = explainRequestSchema.safeParse(body);
  if (!parsed.success) return apiError("validation", 400);
  const input = parsed.data;

  let prescription = input.text;
  let image = input.image;
  if (input.appointmentId) {
    if (!user) return apiError("unauthorized", 401);
    const appt = await getAppointment(user.id, input.appointmentId).catch(() => null);
    if (!appt?.note) return apiError("not_found", 404);
    prescription = appt.note.recommendations.slice(0, 2000);
    image = undefined;
  }
  if (!(await aiDailyBudget())) return apiError("ai_busy", 503);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: ExplainEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      try {
        for await (const event of explain({ locale: input.locale, prescription, image, question: input.question, history: input.history }, req.signal)) {
          send(event);
        }
      } catch {
        send({ t: "error", code: "ai_unavailable" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
