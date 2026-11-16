import { z } from "zod";
import { saveVisitNote } from "@/lib/data/appointments";
import { getCurrentUser } from "@/lib/auth/session";
import { apiError, isSameOrigin, rateLimit, readJson } from "@/lib/security";
import { MAX_NOTE } from "@/lib/validation";

const body = z.object({
  recommendations: z
    .string()
    .max(MAX_NOTE * 2)
    .transform((s) => s.replace(/\u0000/g, "").trim())
    .pipe(z.string().max(MAX_NOTE))
    .nullable()
    .optional(),
  status: z.enum(["completed", "booked", "no_show"]),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return apiError("bad_origin", 403);
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);
  if (user.role !== "doctor") return apiError("forbidden", 403);
  const id = z.uuid().safeParse((await ctx.params).id);
  if (!id.success) return apiError("not_found", 404);
  if (!(await rateLimit([{ key: `note:u:${user.id}`, windowSec: 600, max: 60 }]))) return apiError("rate_limited", 429);

  const json = await readJson(req, 20_000);
  if (json instanceof Response) return json;
  const parsed = body.safeParse(json);
  if (!parsed.success) return apiError("validation", 400);
  const rec = parsed.data.recommendations ?? null;
  if (parsed.data.status === "completed" && rec !== null && rec.length === 0) return apiError("validation", 400);

  try {
    const r = await saveVisitNote(user.id, id.data, rec && rec.length ? rec : null, parsed.data.status);
    return r === "ok" ? Response.json({ ok: true }) : apiError("not_found", 404);
  } catch {
    return apiError("server", 500);
  }
}
