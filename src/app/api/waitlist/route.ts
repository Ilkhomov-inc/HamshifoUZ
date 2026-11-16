import { serverQuery } from "@/lib/db";
import { apiError, ipKey, isSameOrigin, rateLimit, readJson } from "@/lib/security";
import { waitlistSchema } from "@/lib/validation";

/** "Notify me when the app launches". Same response whether or not the email exists (no enumeration). */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return apiError("bad_origin", 403);
  if (!(await rateLimit([{ key: `waitlist:ip:${ipKey(req)}`, windowSec: 3600, max: 5 }]))) return apiError("rate_limited", 429);
  const json = await readJson(req, 1_000);
  if (json instanceof Response) return json;
  const parsed = waitlistSchema.safeParse(json);
  if (!parsed.success) return apiError("validation", 400);
  try {
    await serverQuery(
      "insert into hs.waitlist (email, locale, consent_at) values ($1, $2, now()) on conflict (email) do nothing",
      [parsed.data.email, parsed.data.locale],
    );
  } catch {
    return apiError("server", 500);
  }
  return Response.json({ ok: true });
}
