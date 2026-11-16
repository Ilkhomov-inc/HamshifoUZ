import "server-only";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { serverQuery } from "../db";
import { logEvent, sha256 } from "../security";

const isProd = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = isProd ? "__Host-hs_session" : "hs_session";
export const DEMO_PATIENT_COOKIE = isProd ? "__Host-hs_demo" : "hs_demo";
const SESSION_DAYS = 7;

export type SessionUser = {
  id: string;
  role: "patient" | "doctor";
  fullName: string;
  email: string | null;
  isDemo: boolean;
  doctorId: string | null;
};

export const cookieBase = { httpOnly: true, secure: isProd, sameSite: "lax" as const, path: "/" };

/** Creates a DB session; only a SHA-256 hash of the token is stored. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await serverQuery(
    `insert into hs.sessions (token_hash, user_id, expires_at) values ($1, $2, now() + make_interval(days => $3))`,
    [sha256(token), userId, SESSION_DAYS],
  );
  await serverQuery("update hs.users set last_login_at = now() where id = $1", [userId]);
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieBase, maxAge: SESSION_DAYS * 86400 });
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 128) return null;
  try {
    const rows = await serverQuery<{
      id: string;
      role: "patient" | "doctor";
      full_name: string;
      email: string | null;
      is_demo: boolean;
      doctor_id: string | null;
    }>(
      `select u.id, u.role, u.full_name, u.email, u.is_demo,
              (select d.id from hs.doctors d where d.user_id = u.id and u.role = 'doctor' limit 1) as doctor_id
       from hs.sessions s join hs.users u on u.id = s.user_id
       where s.token_hash = $1 and s.expires_at > now()`,
      [sha256(token)],
    );
    const r = rows[0];
    if (!r) return null;
    return { id: r.id, role: r.role, fullName: r.full_name, email: r.email, isDemo: r.is_demo, doctorId: r.doctor_id };
  } catch (err) {
    logEvent("session.lookup_failed", { error: (err as Error).name });
    return null;
  }
});

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await serverQuery("delete from hs.sessions where token_hash = $1", [sha256(token)]).catch(() => undefined);
  jar.delete({ name: SESSION_COOKIE, path: "/" });
}

/** Only allow same-site relative redirects. */
export function safeReturnTo(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || value.length > 300) {
    return fallback;
  }
  return value;
}
