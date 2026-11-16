/**
 * End-to-end double-booking check against a RUNNING app (local or deployed demo):
 * N separate demo patients try to book the SAME slot at the same moment through
 * the public HTTP API. Expected: exactly 1 × 201 and (N-1) × 409 slot_taken.
 *
 *   BASE_URL=http://localhost:3000 npx tsx scripts/smoke-concurrency.ts
 */
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const N = Number(process.env.N ?? 12);
const headers = { "Content-Type": "application/json", Origin: BASE };

async function demoSession(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/demo`, { method: "POST", headers, body: JSON.stringify({ role: "patient" }) });
  if (!res.ok) throw new Error(`demo login failed: ${res.status}`);
  const cookie = res.headers.getSetCookie().find((c) => /hs_session=/.test(c));
  if (!cookie) throw new Error("no session cookie");
  return cookie.split(";")[0]!;
}

const doctors = (await (await fetch(`${BASE}/api/doctors?specialty=Urolog`)).json()) as { doctors: { id: string; fullName: string }[] };
const doctor = doctors.doctors[0]!;
const { slots } = (await (await fetch(`${BASE}/api/slots?doctorId=${doctor.id}`)).json()) as { slots: { id: string; startsAt: string }[] };
const slot = slots[slots.length - 1]!;
console.log(`Target: ${doctor.fullName}, slot ${slot.startsAt} (${slot.id})`);

const sessions = await Promise.all(Array.from({ length: N }, demoSession));
const results = await Promise.all(
  sessions.map(async (cookie, i) => {
    const res = await fetch(`${BASE}/api/appointments`, {
      method: "POST",
      headers: { ...headers, Cookie: cookie },
      body: JSON.stringify({ slotId: slot.id, name: `Smoke Test ${String.fromCharCode(65 + i)}`, phone: "+998 00 000 00 00", consent: true }),
    });
    const body = (await res.json()) as { error?: { code: string } };
    return `${res.status}${body.error ? ` ${body.error.code}` : ""}`;
  }),
);
const tally = results.reduce<Record<string, number>>((acc, r) => ((acc[r] = (acc[r] ?? 0) + 1), acc), {});
console.log(tally);
const after = (await (await fetch(`${BASE}/api/slots?doctorId=${doctor.id}`)).json()) as { slots: { id: string }[] };
const stillListed = after.slots.some((s) => s.id === slot.id);
console.log(`Slot still listed as free after booking: ${stillListed}`);
const pass = tally["201"] === 1 && tally["409 slot_taken"] === N - 1 && !stillListed;
console.log(pass ? "PASS ✔ exactly one booking won" : "FAIL ✘");
process.exit(pass ? 0 : 1);

export {};
