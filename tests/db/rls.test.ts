import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withRls, type Db } from "@/lib/db";
import { seedFixtures, startTestDb, type TestDb } from "./harness";

let t: TestDb;
let f: Awaited<ReturnType<typeof seedFixtures>>;
let apptA: string; // patient A with doctor 1
let apptB: string; // patient B with doctor 2

const as = <T>(userId: string | null, fn: (db: Db) => Promise<T>) => withRls(userId, fn, t.pool);
const book = (userId: string, slotId: string) =>
  as(userId, async (db) => {
    const r = await db.query<{ result_code: string; result_id: string }>(
      "select * from hs.book_appointment($1, 'Test Patient', '+998901234567', 'yo''tal', 'Terapevt', 'routine')",
      [slotId],
    );
    return r.rows[0]!;
  });

beforeAll(async () => {
  t = await startTestDb();
  f = await seedFixtures(t);
  const s1 = await t.server((db) => f.mkSlot(f.doctor1, 24));
  const s2 = await t.server((db) => f.mkSlot(f.doctor2, 26));
  apptA = (await book(f.patientA, s1)).result_id;
  apptB = (await book(f.patientB, s2)).result_id;
});

afterAll(async () => {
  await t?.stop();
});

describe("Row Level Security is enabled on every table", () => {
  it("has RLS on all hs.* tables", async () => {
    const r = await t.pool.query<{ relname: string; relrowsecurity: boolean }>(
      "select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'hs' and c.relkind = 'r'",
    );
    expect(r.rows.length).toBeGreaterThanOrEqual(10);
    for (const row of r.rows) expect(row, row.relname).toMatchObject({ relrowsecurity: true });
  });
});

describe("anonymous visitors", () => {
  it("can read the public catalogue (clinics, doctors, slots)", async () => {
    await as(null, async (db) => {
      expect((await db.query("select * from hs.clinics")).rowCount).toBe(1);
      expect((await db.query("select id, full_name, specialty from hs.doctors")).rowCount).toBe(2);
      expect((await db.query("select * from hs.slots")).rowCount).toBeGreaterThan(0);
    });
  });
  it("cannot see which user account a doctor is linked to", async () => {
    await expect(as(null, (db) => db.query("select user_id from hs.doctors"))).rejects.toThrow(/permission denied/);
  });
  it("cannot read appointments, users, notes, sessions, waitlist or rate limits", async () => {
    for (const table of ["appointments", "users", "visit_notes", "sessions", "waitlist", "rate_limits"]) {
      await expect(as(null, (db) => db.query(`select * from hs.${table}`)), table).rejects.toThrow(/permission denied/);
    }
  });
  it("cannot book", async () => {
    await expect(
      as(null, (db) => db.query("select * from hs.book_appointment(gen_random_uuid(), 'x y', '+998901234567', '', '', '')")),
    ).rejects.toThrow(/permission denied/);
  });
  it("availability RPC exposes times only, never who booked", async () => {
    const r = await as(null, (db) => db.query("select * from hs.available_slots($1, now(), now() + interval '3 days')", [f.doctor1]));
    expect(Object.keys(r.rows[0] ?? { slot_id: 1, starts_at: 1, ends_at: 1 }).sort()).toEqual(["ends_at", "slot_id", "starts_at"]);
  });
});

describe("patients", () => {
  it("see only their own appointments", async () => {
    const a = await as(f.patientA, (db) => db.query<{ id: string }>("select id from hs.appointments"));
    expect(a.rows.map((r) => r.id)).toEqual([apptA]);
    const b = await as(f.patientA, (db) => db.query("select * from hs.appointments where id = $1", [apptB]));
    expect(b.rowCount).toBe(0);
  });
  it("see only their own user row", async () => {
    const r = await as(f.patientA, (db) => db.query<{ id: string }>("select id from hs.users"));
    expect(r.rows.map((x) => x.id)).toEqual([f.patientA]);
  });
  it("cannot change their own role (column not granted + trigger)", async () => {
    await expect(as(f.patientA, (db) => db.query("update hs.users set role = 'doctor' where id = hs.uid()"))).rejects.toThrow(
      /permission denied/,
    );
    const role = await t.pool.query("select role from hs.users where id = $1", [f.patientA]);
    expect(role.rows[0].role).toBe("patient");
  });
  it("can edit their own name but not someone else's", async () => {
    const own = await as(f.patientA, (db) => db.query("update hs.users set full_name = 'A renamed' where id = $1", [f.patientA]));
    expect(own.rowCount).toBe(1);
    const other = await as(f.patientA, (db) => db.query("update hs.users set full_name = 'hacked' where id = $1", [f.patientB]));
    expect(other.rowCount).toBe(0);
  });
  it("cannot create an appointment in another patient's name", async () => {
    const slot = await t.server(() => f.mkSlot(f.doctor1, 30));
    await expect(
      as(f.patientA, (db) =>
        db.query(
          "insert into hs.appointments (slot_id, doctor_id, patient_id, patient_name, patient_phone) values ($1, $2, $3, 'X Y', '+998901234567')",
          [slot, f.doctor1, f.patientB],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("cannot write visit notes", async () => {
    await expect(
      as(f.patientA, (db) =>
        db.query("insert into hs.visit_notes (appointment_id, doctor_id, recommendations) values ($1, $2, 'fake')", [apptA, f.doctor1]),
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("cannot mark their own visit as completed, only cancel it", async () => {
    await expect(as(f.patientA, (db) => db.query("update hs.appointments set status = 'completed' where id = $1", [apptA]))).rejects.toThrow(
      /invalid_transition/,
    );
  });
  it("cannot cancel someone else's appointment", async () => {
    const r = await as(f.patientA, (db) => db.query("update hs.appointments set status = 'cancelled' where id = $1", [apptB]));
    expect(r.rowCount).toBe(0);
  });
  it("cannot call owner-only functions", async () => {
    await expect(as(f.patientA, (db) => db.query("select hs.generate_slots(1)"))).rejects.toThrow(/permission denied/);
    await expect(as(f.patientA, (db) => db.query("select hs.rate_limit_hit('x', 60, 1)"))).rejects.toThrow(/permission denied/);
  });
});

describe("doctors", () => {
  it("see only appointments assigned to them", async () => {
    const d1 = await as(f.doctorUser1, (db) => db.query<{ id: string }>("select id from hs.appointments"));
    expect(d1.rows.map((r) => r.id)).toEqual([apptA]);
    const d2 = await as(f.doctorUser2, (db) => db.query<{ id: string }>("select id from hs.appointments"));
    expect(d2.rows.map((r) => r.id)).toEqual([apptB]);
  });
  it("cannot read patients' user accounts", async () => {
    const r = await as(f.doctorUser1, (db) => db.query<{ id: string }>("select id from hs.users"));
    expect(r.rows.map((x) => x.id)).toEqual([f.doctorUser1]);
  });
  it("can write notes only for their own appointments", async () => {
    const ok = await as(f.doctorUser1, (db) =>
      db.query("insert into hs.visit_notes (appointment_id, doctor_id, recommendations) values ($1, $2, 'Rest 3 days')", [apptA, f.doctor1]),
    );
    expect(ok.rowCount).toBe(1);
    await expect(
      as(f.doctorUser1, (db) =>
        db.query("insert into hs.visit_notes (appointment_id, doctor_id, recommendations) values ($1, $2, 'x')", [apptB, f.doctor1]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(f.doctorUser1, (db) =>
        db.query("insert into hs.visit_notes (appointment_id, doctor_id, recommendations) values ($1, $2, 'x')", [apptB, f.doctor2]),
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("notes are visible to the patient and their doctor only", async () => {
    expect((await as(f.patientA, (db) => db.query("select * from hs.visit_notes"))).rowCount).toBe(1);
    expect((await as(f.patientB, (db) => db.query("select * from hs.visit_notes"))).rowCount).toBe(0);
    expect((await as(f.doctorUser2, (db) => db.query("select * from hs.visit_notes"))).rowCount).toBe(0);
  });
  it("can complete their own appointment but not another doctor's", async () => {
    const own = await as(f.doctorUser1, (db) => db.query("update hs.appointments set status = 'completed' where id = $1", [apptA]));
    expect(own.rowCount).toBe(1);
    const other = await as(f.doctorUser1, (db) => db.query("update hs.appointments set status = 'completed' where id = $1", [apptB]));
    expect(other.rowCount).toBe(0);
  });
  it("a user with role patient linked to a doctor record gets no doctor powers", async () => {
    const sneaky = await t.server(async (db) => {
      const u = await f.mkUser("Sneaky", "patient");
      await db.query("update hs.doctors set user_id = $1 where id = $2", [u, f.doctor2]);
      return u;
    });
    const r = await as(sneaky, (db) => db.query("select * from hs.appointments"));
    expect(r.rowCount).toBe(0);
    await t.server((db) => db.query("update hs.doctors set user_id = $1 where id = $2", [f.doctorUser2, f.doctor2]));
  });
});
