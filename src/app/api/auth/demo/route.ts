import { z } from "zod";
import { cookies } from "next/headers";
import { createSession, cookieBase, DEMO_PATIENT_COOKIE } from "@/lib/auth/session";
import { withServer } from "@/lib/db";
import { apiError, ipKey, isSameOrigin, logEvent, rateLimit, readJson, sign, verifySigned } from "@/lib/security";
import { DEMO_DOCTOR_EMAIL, provisionDemoPatient } from "@/lib/seed";
import { demoEnabled } from "@/lib/auth/demo";

const body = z.object({ role: z.enum(["patient", "doctor"]) });

/**
 * One-click demo login. Demo patients are isolated per browser (each gets
 * its own low-privilege demo account, remembered in a signed cookie);
 * the demo doctor is a single shared doctor account bound to one doctor.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return apiError("bad_origin", 403);
  if (!demoEnabled()) return apiError("forbidden", 403);
  if (!(await rateLimit([{ key: `demo:ip:${ipKey(req)}`, windowSec: 600, max: 20 }]))) return apiError("rate_limited", 429);

  const json = await readJson(req, 1_000);
  if (json instanceof Response) return json;
  const parsed = body.safeParse(json);
  if (!parsed.success) return apiError("validation", 400);

  const jar = await cookies();
  try {
    let userId: string | null;
    if (parsed.data.role === "doctor") {
      const r = await withServer((db) =>
        db.query<{ id: string }>("select id from hs.users where email = $1 and is_demo and role = 'doctor'", [DEMO_DOCTOR_EMAIL]),
      );
      userId = r.rows[0]?.id ?? null;
    } else {
      const remembered = verifySigned(jar.get(DEMO_PATIENT_COOKIE)?.value);
      userId = await withServer(async (db) => {
        if (remembered && /^[0-9a-f-]{36}$/.test(remembered)) {
          const r = await db.query<{ id: string }>(
            "select id from hs.users where id = $1 and is_demo and role = 'patient'",
            [remembered],
          );
          if (r.rows[0]) return r.rows[0].id;
        }
        return provisionDemoPatient(db);
      });
      jar.set(DEMO_PATIENT_COOKIE, sign(userId), { ...cookieBase, maxAge: 30 * 86400 });
    }
    if (!userId) return apiError("not_found", 503);
    await createSession(userId);
    logEvent("auth.demo", { role: parsed.data.role });
    return Response.json({ ok: true, redirect: parsed.data.role === "doctor" ? "/doctor" : "/appointments" });
  } catch (err) {
    logEvent("auth.demo.error", { error: (err as Error).name });
    return apiError("server", 500);
  }
}
