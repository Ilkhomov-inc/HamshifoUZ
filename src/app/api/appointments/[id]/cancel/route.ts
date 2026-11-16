import { z } from "zod";
import { cancelAppointment } from "@/lib/data/appointments";
import { getCurrentUser } from "@/lib/auth/session";
import { apiError, isSameOrigin, rateLimit } from "@/lib/security";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return apiError("bad_origin", 403);
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);
  const id = z.uuid().safeParse((await ctx.params).id);
  if (!id.success) return apiError("not_found", 404);
  if (!(await rateLimit([{ key: `cancel:u:${user.id}`, windowSec: 600, max: 20 }]))) return apiError("rate_limited", 429);
  try {
    const r = await cancelAppointment(user.id, id.data);
    if (r === "ok") return Response.json({ ok: true });
    return r === "too_late" ? apiError("too_late", 409) : apiError("not_found", 404);
  } catch {
    return apiError("server", 500);
  }
}
