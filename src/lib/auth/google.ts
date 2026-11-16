import "server-only";
import { randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { sha256 } from "../security";

/**
 * Minimal Google OpenID Connect (authorization code + PKCE + state + nonce).
 * The ID token is verified against Google's JWKS (signature, issuer, audience,
 * expiry, nonce). No third-party auth service is involved.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(req: Request): string {
  const base = process.env.APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;
  return `${base}/api/auth/google/callback`;
}

export type OAuthState = { state: string; verifier: string; nonce: string; returnTo: string };

export function newOAuthState(returnTo: string): OAuthState {
  return {
    state: randomBytes(24).toString("base64url"),
    verifier: randomBytes(32).toString("base64url"),
    nonce: randomBytes(24).toString("base64url"),
    returnTo,
  };
}

export function authorizationUrl(req: Request, s: OAuthState): string {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state: s.state,
    nonce: s.nonce,
    code_challenge: sha256(s.verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

export type GoogleIdentity = { sub: string; email: string | null; emailVerified: boolean; name: string };

export async function exchangeCode(req: Request, code: string, s: OAuthState): Promise<GoogleIdentity> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(req),
      grant_type: "authorization_code",
      code_verifier: s.verifier,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("token_exchange_failed");
  const body = (await res.json()) as { id_token?: string };
  if (!body.id_token) throw new Error("no_id_token");
  const { payload } = await jwtVerify(body.id_token, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID!,
  });
  if (payload.nonce !== s.nonce) throw new Error("nonce_mismatch");
  if (typeof payload.sub !== "string") throw new Error("no_sub");
  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
  const name = typeof payload.name === "string" ? payload.name.slice(0, 120) : "";
  return { sub: payload.sub, email, emailVerified: payload.email_verified === true, name };
}
