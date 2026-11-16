import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { serverQuery } from "./db";

/** Server secret; required (≥32 chars) in production. */
export function serverSecret(): string {
  const s = process.env.SESSION_SECRET ?? "";
  if (s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters");
  }
  return "dev-only-insecure-secret-do-not-use-in-production-0000";
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("base64url");
}

export function sign(value: string): string {
  const mac = createHmac("sha256", serverSecret()).update(value).digest("base64url");
  return `${value}.${mac}`;
}

export function verifySigned(signed: string | undefined | null): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = signed.slice(0, idx);
  const mac = Buffer.from(signed.slice(idx + 1));
  const expected = Buffer.from(createHmac("sha256", serverSecret()).update(value).digest("base64url"));
  if (mac.length !== expected.length || !timingSafeEqual(mac, expected)) return null;
  return value;
}

/** Client IP as seen by the platform proxy (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Salted hash so raw IP addresses are never stored. */
export function ipKey(req: Request): string {
  return sha256(`${serverSecret()}|ip|${clientIp(req)}`).slice(0, 24);
}

export type RateRule = { key: string; windowSec: number; max: number };

/** Returns true when ALL rules still allow the request. Fails closed on DB errors. */
export async function rateLimit(rules: RateRule[]): Promise<boolean> {
  try {
    let ok = true;
    for (const r of rules) {
      const rows = await serverQuery<{ ok: boolean }>("select hs.rate_limit_hit($1, $2, $3) as ok", [
        r.key,
        r.windowSec,
        r.max,
      ]);
      if (!rows[0]?.ok) ok = false;
    }
    if (Math.random() < 0.01) {
      serverQuery("delete from hs.rate_limits where window_start < now() - interval '2 days'").catch(() => undefined);
    }
    return ok;
  } catch {
    return false; // fail closed
  }
}

function allowedOrigins(req: Request): Set<string> {
  const set = new Set<string>();
  try {
    set.add(new URL(req.url).origin);
  } catch {
    /* ignore */
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  if (host) set.add(`${proto}://${host}`);
  if (process.env.APP_URL) {
    try {
      set.add(new URL(process.env.APP_URL).origin);
    } catch {
      /* ignore */
    }
  }
  return set;
}

/** CSRF defence for mutating routes: same-origin Origin header required. */
export function isSameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  return allowedOrigins(req).has(origin);
}

export type ApiErrorCode =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "slot_taken"
  | "too_late"
  | "limit_reached"
  | "bad_origin"
  | "ai_unavailable"
  | "ai_busy"
  | "too_large"
  | "server";

export function apiError(code: ApiErrorCode, status: number): Response {
  return Response.json({ error: { code } }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Read a JSON body with a hard size cap. */
export async function readJson(req: Request, maxBytes: number): Promise<unknown | Response> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > maxBytes) return apiError("too_large", 413);
  const text = await req.text();
  if (text.length > maxBytes) return apiError("too_large", 413);
  try {
    return JSON.parse(text);
  } catch {
    return apiError("validation", 400);
  }
}

/** Structured, PII-free logging. Never pass user text, names, phones, emails or IPs. */
export function logEvent(event: string, data: Record<string, string | number | boolean | null | undefined> = {}) {
  console.log(JSON.stringify({ t: new Date().toISOString(), event, ...data }));
}
