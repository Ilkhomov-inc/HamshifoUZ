import { NextResponse } from "next/server";
import { authorizationUrl, googleConfigured, newOAuthState } from "@/lib/auth/google";
import { cookieBase, safeReturnTo } from "@/lib/auth/session";
import { ipKey, rateLimit, sign } from "@/lib/security";

const OAUTH_COOKIE = "hs_oauth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!googleConfigured()) return NextResponse.redirect(new URL("/signin?error=google", url), 303);
  if (!(await rateLimit([{ key: `auth:ip:${ipKey(req)}`, windowSec: 600, max: 30 }]))) {
    return NextResponse.redirect(new URL("/signin?error=rate", url), 303);
  }
  const state = newOAuthState(safeReturnTo(url.searchParams.get("returnTo")));
  const res = NextResponse.redirect(authorizationUrl(req, state), 303);
  res.cookies.set(OAUTH_COOKIE, sign(Buffer.from(JSON.stringify(state)).toString("base64url")), {
    ...cookieBase,
    path: "/api/auth",
    maxAge: 600,
  });
  return res;
}
