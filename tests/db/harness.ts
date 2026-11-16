import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import { Pool } from "pg";
import { applyMigrations } from "@/lib/migrations";
import { withServer, type Db } from "@/lib/db";

/**
 * Starts a throwaway Postgres cluster, creates a NON-superuser owner role
 * (like Supabase/Neon) and applies the real migrations.
 */
export async function startTestDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hs-pg-test-"));
  const port = 55000 + Math.floor(Math.random() * 4000);
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: false,
    autoRehydrateSymlinks: true,
    onLog: () => undefined,
    onError: () => undefined,
  });
  await pg.initialise();
  await pg.start();
  const admin = pg.getPgClient();
  await admin.connect();
  await admin.query("create role hs_test_owner login password 'owner' createrole");
  await admin.query("create database hs_test owner hs_test_owner");
  await admin.end();

  const pool = new Pool({ connectionString: `postgres://hs_test_owner:owner@127.0.0.1:${port}/hs_test`, max: 40 });
  pool.on("error", () => undefined); // idle clients are terminated when the cluster stops
  await applyMigrations(pool, path.resolve("migrations"));

  return {
    pool,
    server: <T>(fn: (db: Db) => Promise<T>) => withServer(fn, pool),
    async stop() {
      await pool.end();
      await pg.stop();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

export type TestDb = Awaited<ReturnType<typeof startTestDb>>;

export async function seedFixtures(t: TestDb) {
  return t.server(async (db) => {
    const clinic = await db.query<{ id: string }>(
      "insert into hs.clinics (slug, name, city, address, phone) values ('c1','Test clinic','fergana','Addr','+998 00 000 00 00') returning id",
    );
    const mkUser = async (name: string, role = "patient") =>
      (await db.query<{ id: string }>("insert into hs.users (full_name, role) values ($1, $2) returning id", [name, role])).rows[0]!.id;
    const patientA = await mkUser("Patient A");
    const patientB = await mkUser("Patient B");
    const doctorUser1 = await mkUser("Doctor One", "doctor");
    const doctorUser2 = await mkUser("Doctor Two", "doctor");
    const mkDoctor = async (slug: string, userId: string, spec: string) =>
      (
        await db.query<{ id: string }>(
          `insert into hs.doctors (slug, clinic_id, user_id, full_name, specialty, room, contact_phone)
           values ($1, $2, $3, $1, $4, '1', '+998 00 000 00 01') returning id`,
          [slug, clinic.rows[0]!.id, userId, spec],
        )
      ).rows[0]!.id;
    const doctor1 = await mkDoctor("doc-1", doctorUser1, "Terapevt");
    const doctor2 = await mkDoctor("doc-2", doctorUser2, "LOR");
    const mkSlot = async (doctorId: string, hoursFromNow: number) =>
      (
        await db.query<{ id: string }>(
          "insert into hs.slots (doctor_id, starts_at, ends_at) values ($1, now() + make_interval(hours => $2), now() + make_interval(hours => $2) + interval '20 minutes') returning id",
          [doctorId, hoursFromNow],
        )
      ).rows[0]!.id;
    return { patientA, patientB, doctorUser1, doctorUser2, doctor1, doctor2, mkSlot, mkUser };
  });
}
