import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, type OAuthState } from "@/lib/auth/google";
import { createSession, safeReturnTo } from "@/lib/auth/session";
import { withServer } from "@/lib/db";
import { logEvent, verifySigned } from "@/lib/security";

const OAUTH_COOKIE = "hs_oauth";

function sameString(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const raw = verifySigned(jar.get(OAUTH_COOKIE)?.value);
  jar.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
  const fail = () => NextResponse.redirect(new URL("/signin?error=google", url), 303);

  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  if (!raw || !code || !stateParam || code.length > 2048) return fail();

  let state: OAuthState;
  try {
    state = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as OAuthState;
  } catch {
    return fail();
  }
  if (!sameString(state.state, stateParam)) return fail();

  try {
    const id = await exchangeCode(req, code, state);
    const userId = await withServer(async (db) => {
      const bySub = await db.query<{ id: string }>("select id from hs.users where google_sub = $1", [id.sub]);
      if (bySub.rows[0]) return bySub.rows[0].id;
      // Link an admin-provisioned (doctor) account only for a Google-verified email.
      if (id.email && id.emailVerified) {
        const linked = await db.query<{ id: string }>(
          `update hs.users set google_sub = $1, full_name = case when full_name = '' then $3 else full_name end
           where email = $2 and google_sub is null and not is_demo returning id`,
          [id.sub, id.email, id.name],
        );
        if (linked.rows[0]) return linked.rows[0].id;
      }
      // Everyone else becomes a patient. The role is never taken from the client.
      const created = await db.query<{ id: string }>(
        `insert into hs.users (google_sub, email, full_name, role) values ($1, $2, $3, 'patient')
         on conflict do nothing returning id`,
        [id.sub, id.emailVerified ? id.email : null, id.name],
      );
      return created.rows[0]?.id ?? null;
    });
    if (!userId) return fail();
    await createSession(userId);
    logEvent("auth.google", { ok: true });
    return NextResponse.redirect(new URL(safeReturnTo(state.returnTo), url), 303);
  } catch (err) {
    logEvent("auth.google", { ok: false, error: (err as Error).message.slice(0, 40) });
    return fail();
  }
}
