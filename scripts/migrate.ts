import "./_env";
import { Pool } from "pg";
import { applyMigrations } from "../src/lib/migrations";
import { getPool } from "../src/lib/db";

const pool: Pool = getPool();
const applied = await applyMigrations(pool);
console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Database is up to date.");
await pool.end();
