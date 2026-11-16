import { destroySession } from "@/lib/auth/session";
import { apiError, isSameOrigin } from "@/lib/security";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return apiError("bad_origin", 403);
  await destroySession();
  return Response.json({ ok: true });
}
