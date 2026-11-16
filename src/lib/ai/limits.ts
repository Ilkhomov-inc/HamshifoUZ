import { ipKey, rateLimit } from "../security";

/** Per-IP, per-user and global daily limits for AI endpoints. */
export async function aiRateLimit(req: Request, userId: string | null, kind: "route" | "explain"): Promise<"ok" | "limited"> {
  const perIp = kind === "route" ? 20 : 15;
  const perUser = kind === "route" ? 40 : 30;
  const rules = [{ key: `ai:${kind}:ip:${ipKey(req)}`, windowSec: 600, max: perIp }];
  if (userId) rules.push({ key: `ai:${kind}:u:${userId}`, windowSec: 3600, max: perUser });
  return (await rateLimit(rules)) ? "ok" : "limited";
}

/** Cost circuit breaker: false once the global daily AI budget is used up. */
export async function aiDailyBudget(): Promise<boolean> {
  const max = Number(process.env.AI_DAILY_LIMIT ?? 3000);
  return rateLimit([{ key: "ai:global", windowSec: 86400, max }]);
}
