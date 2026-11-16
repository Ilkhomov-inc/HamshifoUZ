import fs from "node:fs";
import path from "node:path";
import type { Pool } from "pg";

/** Applies migrations/*.sql in order, each in its own transaction. Idempotent. */
export async function applyMigrations(pool: Pool, dir = path.resolve(process.cwd(), "migrations")): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query(`
      create schema if not exists hs;
      create table if not exists hs._migrations (name text primary key, applied_at timestamptz not null default now());
      alter table hs._migrations enable row level security;
    `);
    const done = new Set((await client.query<{ name: string }>("select name from hs._migrations")).rows.map((r) => r.name));
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into hs._migrations(name) values ($1)", [file]);
        await client.query("commit");
        applied.push(file);
      } catch (err) {
        await client.query("rollback");
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }
  } finally {
    client.release();
  }
  return applied;
}
