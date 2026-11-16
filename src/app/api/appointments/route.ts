import { bookAppointment } from "@/lib/data/appointments";
import { getCurrentUser } from "@/lib/auth/session";
import { apiError, isSameOrigin, logEvent, rateLimit, readJson, ipKey } from "@/lib/security";
import { bookingRequestSchema } from "@/lib/validation";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return apiError("bad_origin", 403);
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const allowed = await rateLimit([
    { key: `book:u:${user.id}`, windowSec: 600, max: 15 },
    { key: `book:ip:${ipKey(req)}`, windowSec: 600, max: 40 },
  ]);
  if (!allowed) return apiError("rate_limited", 429);

  const body = await readJson(req, 8_000);
  if (body instanceof Response) return body;
  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? "")))];
    return Response.json({ error: { code: "validation", fields } }, { status: 400 });
  }

  try {
    const result = await bookAppointment(user.id, parsed.data);
    logEvent("booking", { result: result.code });
    switch (result.code) {
      case "ok":
        return Response.json({ id: result.id }, { status: 201 });
      case "slot_taken":
        return apiError("slot_taken", 409);
      case "too_late":
        return apiError("too_late", 409);
      case "limit_reached":
        return apiError("limit_reached", 409);
      case "unauthenticated":
        return apiError("unauthorized", 401);
      default:
        return apiError("not_found", 404);
    }
  } catch (err) {
    logEvent("booking.error", { error: (err as Error).name });
    return apiError("server", 500);
  }
}
