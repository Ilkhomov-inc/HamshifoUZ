import { Pool, type PoolClient, type QueryResultRow } from "pg";

/**
 * Postgres access.
 *
 *  withRls(userId, fn)  → every query inside runs as role hs_user / hs_anon
 *                          with hs.user_id set, so Row Level Security applies.
 *  withServer(fn)       → owner context (bypasses RLS). Only for server-internal
 *                          work: sessions, sign-in upsert, rate limits, demo
 *                          provisioning, waitlist, maintenance.
 *
 * All queries are parameterized; no SQL is ever built from user input.
 */

declare global {
  var __hsPool: Pool | undefined;
}

export type Db = Pick<PoolClient, "query">;

function sslConfig() {
  const mode = process.env.DATABASE_SSL;
  if (mode === "require") {
    const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
    return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true };
  }
  if (mode === "no-verify") return { rejectUnauthorized: false };
  return undefined;
}

export function getPool(): Pool {
  if (!globalThis.__hsPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    globalThis.__hsPool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 6_000,
      ssl: sslConfig(),
    });
    globalThis.__hsPool.on("error", () => {
      /* idle client errors are recovered by the pool; never crash the process */
    });
  }
  return globalThis.__hsPool;
}

async function inTransaction<T>(
  setup: (c: PoolClient) => Promise<void>,
  fn: (c: PoolClient) => Promise<T>,
  pool: Pool = getPool(),
): Promise<T> {
  const client = await pool.connect();
  try {
    await setup(client);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** Run `fn` as the given user (or anonymous) with RLS enforced by Postgres. */
export function withRls<T>(userId: string | null, fn: (db: Db) => Promise<T>, pool?: Pool): Promise<T> {
  return inTransaction(
    async (c) => {
      await c.query(userId ? "begin; set local role hs_user" : "begin; set local role hs_anon");
      await c.query(
        "select set_config('hs.user_id', $1, true), set_config('statement_timeout', '8000', true)",
        [userId ?? ""],
      );
    },
    fn,
    pool,
  );
}

/** Owner context — server-internal only. Never pass user-controlled SQL. */
export function withServer<T>(fn: (db: Db) => Promise<T>, pool?: Pool): Promise<T> {
  return inTransaction(
    async (c) => {
      await c.query("begin");
      await c.query("select set_config('hs.user_id', '', true), set_config('statement_timeout', '8000', true)");
    },
    fn,
    pool,
  );
}

export async function serverQuery<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<R[]> {
  const res = await getPool().query<R>(text, params);
  return res.rows;
}
