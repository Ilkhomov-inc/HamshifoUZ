import { timingSafeEqual } from "node:crypto";
import { withServer } from "@/lib/db";
import { logEvent } from "@/lib/security";

/** Daily maintenance (Vercel Cron): top up 14 days of slots, purge expired sessions and old demo patients. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || auth.length !== expected.length || !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return new Response("Not found", { status: 404 });
  }
  const result = await withServer(async (db) => {
    const slots = await db.query<{ n: number }>("select hs.generate_slots(14) as n");
    const sessions = await db.query("delete from hs.sessions where expires_at < now()");
    const demo = await db.query(
      "delete from hs.users where is_demo and role = 'patient' and phone is null and created_at < now() - interval '3 days'",
    );
    await db.query("delete from hs.rate_limits where window_start < now() - interval '2 days'");
    return { slots: slots.rows[0]!.n, sessions: sessions.rowCount ?? 0, demoPatients: demo.rowCount ?? 0 };
  });
  logEvent("cron.maintain", result);
  return Response.json(result);
}
