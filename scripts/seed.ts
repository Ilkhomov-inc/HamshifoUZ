/** Re-creates all DEMO data (clinics, doctors, 14 days of slots, demo accounts). Safe to re-run. */
import "./_env";
import { getPool, withServer } from "../src/lib/db";
import { reseed } from "../src/lib/seed";

const res = await withServer((db) => reseed(db));
console.log(`Seeded demo data: ${res.slots} slots, ${res.appointments} appointments.`);
await getPool().end();
