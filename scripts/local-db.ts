/**
 * Local development Postgres (no Docker needed): an embedded Postgres server
 * in .local/pgdata on 127.0.0.1:54329. Creates a NON-superuser app role so
 * RLS behaves exactly like on hosted Postgres. Keep this running in a terminal.
 */
import fs from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const dir = path.resolve(".local/pgdata");
const firstRun = !fs.existsSync(path.join(dir, "PG_VERSION"));
const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: "postgres",
  password: "postgres",
  port: 54329,
  persistent: true,
  autoRehydrateSymlinks: true,
  onLog: () => undefined,
});

if (firstRun) await pg.initialise();
await pg.start();
if (firstRun) {
  const c = pg.getPgClient();
  await c.connect();
  await c.query("create role hamshifo_app login password 'hamshifo_app' createrole");
  await c.query("create database hamshifo owner hamshifo_app");
  await c.end();
}
console.log("Local Postgres ready: postgres://hamshifo_app:hamshifo_app@127.0.0.1:54329/hamshifo (Ctrl+C to stop)");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => undefined, 1 << 30);
