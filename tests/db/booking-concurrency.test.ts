import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withRls } from "@/lib/db";
import { seedFixtures, startTestDb, type TestDb } from "./harness";

let t: TestDb;
let f: Awaited<ReturnType<typeof seedFixtures>>;
let patients: string[];

const book = (userId: string, slotId: string) =>
  withRls(
    userId,
    async (db) => {
      const r = await db.query<{ result_code: string; result_id: string | null }>(
        "select * from hs.book_appointment($1, 'Test Patient', '+998901234567', '', 'Terapevt', 'routine')",
        [slotId],
      );
      return r.rows[0]!.result_code;
    },
    t.pool,
  );

beforeAll(async () => {
  t = await startTestDb();
  f = await seedFixtures(t);
  patients = [];
  for (let i = 0; i < 30; i++) patients.push(await t.server(() => f.mkUser(`Concurrent ${i}`)));
});

afterAll(async () => {
  await t?.stop();
});

/**
 * A brand-new patient with no bookings. The `patients` pool races in the first test and each
 * round's winner keeps an active booking, so reusing pool members made the later tests depend
 * on who happened to win (the 5-booking cap could trip early).
 */
const freshPatient = (name: string) => t.server(() => f.mkUser(name));

describe("booking integrity under concurrency", () => {
  it("30 simultaneous bookings of one slot → exactly one succeeds (5 rounds)", async () => {
    for (let round = 0; round < 5; round++) {
      const slot = await t.server(() => f.mkSlot(f.doctor1, 48 + round));
      const results = await Promise.all(patients.map((p) => book(p, slot)));
      const ok = results.filter((r) => r === "ok").length;
      const taken = results.filter((r) => r === "slot_taken").length;
      expect(ok, `round ${round}`).toBe(1);
      expect(taken, `round ${round}`).toBe(29);
      const active = await t.pool.query("select count(*)::int as n from hs.appointments where slot_id = $1 and status <> 'cancelled'", [slot]);
      expect(active.rows[0].n).toBe(1);
    }
  });

  it("raw concurrent INSERTs (bypassing the RPC) are still stopped by the UNIQUE index", async () => {
    const slot = await t.server(() => f.mkSlot(f.doctor2, 80));
    const results = await Promise.allSettled(
      patients.slice(0, 15).map((p) =>
        withRls(
          p,
          (db) =>
            db.query(
              "insert into hs.appointments (slot_id, doctor_id, patient_id, patient_name, patient_phone) values ($1, $2, hs.uid(), 'Raw Insert', '+998901234567')",
              [slot, f.doctor2],
            ),
          t.pool,
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results.filter((x) => x.status === "rejected")) {
      expect(String((r as PromiseRejectedResult).reason)).toMatch(/appointments_one_active_per_slot|duplicate key/);
    }
  });

  it("a cancelled slot becomes bookable again", async () => {
    const slot = await t.server(() => f.mkSlot(f.doctor1, 100));
    const [first, second] = [await freshPatient("Cancel A"), await freshPatient("Cancel B")];
    expect(await book(first, slot)).toBe("ok");
    expect(await book(second, slot)).toBe("slot_taken");
    await withRls(first, (db) => db.query("update hs.appointments set status = 'cancelled' where slot_id = $1", [slot]), t.pool);
    expect(await book(second, slot)).toBe("ok");
    const free = await t.pool.query("select * from hs.available_slots($1, now(), now() + interval '15 days') where slot_id = $2", [f.doctor1, slot]);
    expect(free.rowCount).toBe(0); // taken slots disappear from availability
  });

  it("rejects slots in the past / too soon", async () => {
    const past = await t.server(() => f.mkSlot(f.doctor1, -2));
    expect(await book(await freshPatient("Too late"), past)).toBe("too_late");
  });

  it("caps active bookings per patient at 5", async () => {
    const p = await freshPatient("Cap");
    const codes: string[] = [];
    for (let i = 0; i < 6; i++) codes.push(await book(p, await t.server(() => f.mkSlot(f.doctor2, 120 + i))));
    expect(codes.slice(0, 5).every((c) => c === "ok")).toBe(true);
    expect(codes[5]).toBe("limit_reached");
  });

  it("forces doctor_id from the slot, ignoring a spoofed value", async () => {
    const slot = await t.server(() => f.mkSlot(f.doctor1, 200));
    // composite FK + trigger: a spoofed doctor id cannot be stored
    await withRls(
      await freshPatient("Spoof"),
      (db) =>
        db.query(
          "insert into hs.appointments (slot_id, doctor_id, patient_id, patient_name, patient_phone) values ($1, $2, hs.uid(), 'Spoof Test', '+998901234567')",
          [slot, f.doctor2],
        ),
      t.pool,
    );
    const r = await t.pool.query("select doctor_id from hs.appointments where slot_id = $1", [slot]);
    expect(r.rows[0].doctor_id).toBe(f.doctor1);
  });
});
