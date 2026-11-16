# Hamshifo UZ — sog'liq sari yo'lda yo'ldoshingiz

An electronic queue and appointment-slot system for polyclinics in the Fergana region (Uzbekistan), with **Hamdard AI**: an assistant that removes the two causes of avoidable extra queues:

1. **Queuing for the wrong doctor.** Describe your symptoms and Hamdard AI suggests which specialist to book.
2. **Coming back only because a prescription was unclear.** Hamdard AI explains the doctor's written instructions in plain language and sends serious questions back to the doctor.

> **Demo data.** All clinics, doctors, patients, phone numbers and prescriptions are fictional. Pharmacy (Dorixona) and the mobile app are "Coming soon" only.

---

## What works

| Area | Status |
|---|---|
| Public landing page (uz / ru / en), animated hero with live symptom → specialist demo | ✅ |
| Google sign-in (OpenID Connect, authorization code + PKCE + state + nonce, ID token verified against Google JWKS) | ✅ code complete; needs your Google OAuth client to run |
| One-click **demo patient** / **demo doctor** (low-privilege, clearly labelled) | ✅ |
| Symptoms → Hamdard AI specialty (structured JSON, zod-validated, 1 retry, keyword fallback) → doctor → calendar → time slot → name + phone + consent → confirmation | ✅ |
| Deterministic emergency rule (uz/ru/en red flags) → red **103** banner, runs before and independently of the AI | ✅ |
| Taken slots disappear; double booking impossible (partial UNIQUE index + atomic RPC), clean "slot just taken" + refresh | ✅ tested with concurrent requests |
| My appointments, cancel, appointment detail | ✅ |
| Doctor dashboard: day / week, patient symptoms + AI suggestion, write recommendations, complete / no-show | ✅ |
| Post-visit: patient sees recommendations; Hamdard AI explains (streamed), follow-up questions, "needs a doctor" routing with **Find a follow-up slot** + **Doctor's contact** | ✅ |
| Prescription explainer from pasted text or photo (photo processed in memory only) | ✅ |
| "About this demo" page, privacy page, demo banner | ✅ |
| Pharmacy + mobile app sections ("Coming soon", disabled buttons, optional notify-me with consent) | ✅ |

## Stack and why

- **Next.js 16 (App Router, TypeScript), Tailwind CSS v4, Motion.** UI components are hand-written in the shadcn/ui style, with no Radix, to keep the bundle small.
- **PostgreSQL with Row Level Security, accessed only from the server.** Every request that touches user data runs in a transaction that does `SET LOCAL ROLE hs_user` (or `hs_anon`) and sets `hs.user_id`, so **Postgres itself enforces RLS** on every query. This is the same mechanism Supabase uses internally, but without exposing a public data API or an anon key to the browser. It runs on **Supabase Postgres** or **Neon** in production, and on an embedded Postgres locally and in tests (no Docker required).
- **First-party Google OAuth** (no third-party auth SDK) plus DB-backed sessions. The cookie holds a random token; the DB stores only its SHA-256 hash.
- **Anthropic Claude Haiku 5.5** (`ANTHROPIC_MODEL`, default `claude-haiku-5-5`), called only from server route handlers.

*Why not Supabase Auth + supabase-js?* It would put an anon key and a PostgREST surface in the browser, and it can't be run or tested here without Docker. The chosen design keeps RLS as defence-in-depth at the database level, is fully testable locally, and still deploys to Supabase's Postgres.

---

## Run locally (no Docker)

Requirements: Node.js ≥ 20.9.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Terminal 1, start the embedded Postgres (keeps running):

```bash
npm run db:local
```

Terminal 2, create the schema and demo data, then start the app:

```bash
npm run db:reset
```

```bash
npm run dev
```

Open http://localhost:3000 and use **Kirish → Demo bemor / Demo shifokor**.

- Without `ANTHROPIC_API_KEY`, symptom routing uses the keyword fallback (the flow still works) and the explainer gives a basic automatic summary of a typed note (daily schedule, follow-up date) and tells the patient to ask the doctor; a photo without the model shows "AI unavailable".
- `AI_MOCK=1` (development only, ignored in production) streams canned explainer answers so you can try the UI without a key.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `APP_URL` | prod | Public base URL, e.g. `https://hamshifo.vercel.app`. Used for the OAuth redirect URI and Origin checks. |
| `DATABASE_URL` | ✅ | Postgres connection string (Supabase *Transaction pooler* URI or Neon *pooled* URI). |
| `DATABASE_SSL` | prod | `require` (verify certificate; add `DATABASE_CA_CERT` for Supabase's CA) or `no-verify` (encrypted, not verified). |
| `DATABASE_CA_CERT` | optional | PEM of the DB server CA (Supabase → Database → SSL). `\n` escapes are supported. |
| `SESSION_SECRET` | ✅ | ≥ 32 random chars. Signs OAuth/demo cookies and salts IP hashes. `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | for Google | OAuth client (Web application). |
| `ANTHROPIC_API_KEY` | for AI | Server-side only. |
| `ANTHROPIC_MODEL` | optional | Default `claude-haiku-5-5`. |
| `AI_PROVIDER` | optional | `gemini` or `anthropic`. Empty: Anthropic if `ANTHROPIC_API_KEY` is set, otherwise Gemini. |
| `GEMINI_API_KEY` | for AI (Gemini) | Google AI Studio key, server-side only. Free tier works. |
| `GEMINI_MODEL` | optional | One model or a comma-separated fallback list. Default `gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-lite-latest`. |
| `AI_DAILY_LIMIT` | optional | Global AI calls per day (cost circuit breaker), default 3000. |
| `DEMO_MODE` | optional | `false` disables demo logins. |
| `CRON_SECRET` | prod | Protects `/api/cron/maintain` (Vercel Cron sends it as a Bearer token). |
| `AI_MOCK` | dev only | `1` streams canned answers; ignored in production. |

Never commit `.env.local`; it is git-ignored. Secrets are read only on the server.

---

## Deploy (Vercel + Supabase), about 15 minutes

1. **Database.** Create a Supabase project (region close to your Vercel region, e.g. Frankfurt). Copy *Project Settings → Database → Connection string → Transaction pooler* (port 6543).
2. **Schema and demo data**, from your machine:
   ```bash
   DATABASE_URL="postgres://postgres.<ref>:<password>@<host>:6543/postgres" DATABASE_SSL=no-verify npm run db:reset
   ```
   Tables live in a private schema `hs` that Supabase's REST API does not expose; RLS is enabled on every table anyway.
3. **Google OAuth.** See below. Add `https://<your-app>.vercel.app/api/auth/google/callback` as a redirect URI.
4. **Vercel.** Import the repo (or run `npx vercel` from this folder), then set the environment variables from the table above (`APP_URL`, `DATABASE_URL`, `DATABASE_SSL`, `SESSION_SECRET`, `GOOGLE_*`, `AI_PROVIDER` + `GEMINI_API_KEY` or `ANTHROPIC_API_KEY`, `CRON_SECRET`). Deploy.
5. Optionally set the function region next to the database (*Project → Settings → Functions → Region*).
6. `vercel.json` registers a daily cron (`/api/cron/maintain`) that tops up 14 days of slots, deletes expired sessions and removes demo patients older than 3 days.

Neon also works: use the *pooled* connection string and `DATABASE_SSL=require`.

## Google OAuth setup

1. Google Cloud Console → **APIs & Services → OAuth consent screen**: External, app name "Hamshifo UZ", scopes `openid`, `email`, `profile`. While the app is in *Testing*, only listed test users can sign in. *Publish* it for everyone; these basic scopes don't need verification.
2. **Credentials → Create credentials → OAuth client ID → Web application.**
   - Authorized JavaScript origins: `https://<your-app>.vercel.app`, `http://localhost:3000`
   - Authorized redirect URIs: `https://<your-app>.vercel.app/api/auth/google/callback`, `http://localhost:3000/api/auth/google/callback`
3. Put the client ID and secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. The redirect URI the app sends is `${APP_URL}/api/auth/google/callback`.

Everyone who signs in with Google becomes a **patient**. Roles are never taken from the client.

## Doctor accounts (admin only)

Users can never assign themselves a role. An administrator with database credentials links a Google email to a doctor record:

```bash
npm run doctor:create -- --list
```

```bash
npm run doctor:create -- --email someone@gmail.com --doctor dilnoza-karimova
```

On that person's next Google sign-in (with a Google-verified email) the account is linked and they see the doctor dashboard. Their existing sessions are revoked when the role changes.

## Demo accounts and reseeding

- **Demo patient:** each browser gets its own isolated demo patient (remembered in a signed cookie), pre-filled with one past visit and a doctor's recommendation, so the post-visit explainer can be tried immediately. Demo patients are deleted after 3 days by the cron.
- **Demo doctor:** Dr. Dilnoza Karimova (Terapevt, Fergana). Sees only her own appointments.
- Reset everything (keeps real Google users, resets all appointments): `npm run db:seed`

---

## Tests

```bash
npm test
```

120 tests, about 2–3 s. The database tests start a throwaway embedded Postgres with a **non-superuser** owner, exactly like hosted Postgres, and run the real migrations.

| File | Covers |
|---|---|
| `tests/db/booking-concurrency.test.ts` | 5 rounds × 30 simultaneous bookings of one slot → exactly 1 success; raw concurrent INSERTs blocked by the UNIQUE index; cancel → re-bookable; past slots rejected; 5-booking cap; spoofed doctor id ignored |
| `tests/db/rls.test.ts` | RLS enabled on every table; anon can only read the catalogue; patients see only their own data; doctors only their own appointments and notes; role cannot be self-changed; owner-only functions not callable |
| `tests/unit/router-fallback.test.ts` | Structured-output validation, one retry, keyword fallback, transport errors, emergency short-circuit, model can only escalate urgency |
| `tests/unit/emergency.test.ts` | Red-flag detection in uz (Latin + Cyrillic), ru, en, plus negatives |
| `tests/unit/ai-safety.test.ts` | Doctor-marker stream filter, serious-question detector, prompt-injection fencing |
| `tests/unit/validation.test.ts` | Phone/name/symptom/consent/image validation |
| `tests/unit/anthropic-wire.test.ts` | Real Anthropic SDK against a local mock API: request shape (model, json_schema with the 12 specialties, effort, prompt caching, no PII), JSON parsing, SSE streaming, marker stripping, image block |

End-to-end check against a running app (12 separate demo patients race for one slot through the HTTP API):

```bash
BASE_URL=http://localhost:3000 npm run test:smoke
```

Manual QA checklist: [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md).

## Hamdard AI quality check

```bash
npm run ai:eval
```

Scores the rule layer (no API key needed) on labelled phrases in `tests/ai-eval/cases.ts`; add `-- --live` to score the real model (needs `ANTHROPIC_API_KEY`, costs a little). On phrases the rules were never tuned on: right specialist 35/46 (76%), emergencies caught 12/20 (60%), false alarms 0/12; the previous build scored 24/46, 3/20 and 0/12 on the same phrases. The rules are the safety net under the model, not a replacement: the live model has not been scored yet.

What Hamdard does beyond routing: answers in the language and script the patient typed (Uzbek Latin or Cyrillic, Russian, English), shows what it understood, offers a second specialist when two fit, asks at most one clarifying question when the description is vague, and reads typed dosing lines into a daily schedule without the model.

## Security summary

- **RLS on every table**, enforced by Postgres for every user-data query (`hs_user` / `hs_anon` roles; column-level grants; guard triggers). Deny-all tables: sessions, waitlist, rate limits.
- **Booking integrity:** partial unique index `appointments(slot_id) WHERE status <> 'cancelled'`, an atomic `hs.book_appointment` RPC, and a composite FK so an appointment's doctor always matches its slot.
- **Auth:** httpOnly, SameSite=Lax, Secure, `__Host-` cookies in production; hashed session tokens; state + PKCE + nonce; same-site `returnTo` only.
- **CSRF:** the proxy and every mutating route require a same-origin `Origin` (and reject `Sec-Fetch-Site: cross-site`).
- **Rate limits** (Postgres-backed, shared by all instances) on auth, demo login, booking, cancel, AI and waitlist, plus a global daily AI budget.
- **Headers:** nonce-based strict CSP (`script-src 'nonce-…' 'strict-dynamic'`, `frame-ancestors 'none'`, `object-src 'none'`), HSTS (production), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, COOP. API responses get `default-src 'none'` and `no-store`.
- **AI layer:** server-only key; only symptom/prescription text is sent (never name, phone or email); user text is fenced and treated as data; the model has no tools and no DB access; output is length-capped and rendered as React text (never raw HTML); inputs capped at 1500 chars; timeouts; refusal handling; brief in-memory caching; PII-free logs; photos are never stored.
- **Validation:** zod on every route; parameterized SQL only; generic error codes; no enumeration (waitlist responds identically).
- `npm audit`: 0 vulnerabilities at the time of writing.

## Project layout

```
migrations/001_init.sql      schema, roles, RLS policies, triggers, RPCs
scripts/                     local-db, migrate, seed, create-doctor, smoke-concurrency
src/proxy.ts                 CSP nonce + CSRF origin check
src/lib/db.ts                withRls() / withServer()
src/lib/ai/                  router, explainer, emergency rules, keyword fallback, prompts, schemas
src/lib/auth/                sessions, Google OIDC, demo
src/lib/i18n/                uz (default), ru, en dictionaries
src/app/                     pages + API route handlers
src/components/              UI (booking flow, explainer chat, landing, doctor)
tests/                       unit + database tests
```
