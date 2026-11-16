import type { Db } from "./db";
import type { Specialty } from "./ai/specialties";

/**
 * DEMO DATA ONLY. Every clinic, doctor, patient, phone number and prescription
 * below is fictional. Phone numbers use the non-existent "00" operator code.
 */

export const DEMO_DOCTOR_EMAIL = "demo-doctor@hamshifo.invalid";
export const DEMO_DOCTOR_SLUG = "dilnoza-karimova";

export const CLINICS = [
  { slug: "fergana-demo", name: "Farg'ona oilaviy poliklinikasi (demo)", city: "fergana", address: "Farg'ona sh., Namuna ko'chasi, 12", phone: "+998 00 000 01 01" },
  { slug: "margilan-demo", name: "Marg'ilon shahar poliklinikasi (demo)", city: "margilan", address: "Marg'ilon sh., Namuna ko'chasi, 7", phone: "+998 00 000 02 02" },
  { slug: "kokand-demo", name: "Qo'qon oilaviy poliklinikasi (demo)", city: "kokand", address: "Qo'qon sh., Namuna ko'chasi, 3", phone: "+998 00 000 03 03" },
] as const;

type DoctorSeed = { slug: string; clinic: (typeof CLINICS)[number]["slug"]; name: string; specialty: Specialty; room: string; minutes: number; langs: string[] };

export const DOCTORS: DoctorSeed[] = [
  { slug: DEMO_DOCTOR_SLUG, clinic: "fergana-demo", name: "Dilnoza Karimova", specialty: "Terapevt", room: "104", minutes: 20, langs: ["uz", "ru"] },
  { slug: "umida-sobirova", clinic: "margilan-demo", name: "Umida Sobirova", specialty: "Terapevt", room: "12", minutes: 20, langs: ["uz", "ru"] },
  { slug: "akmal-jorayev", clinic: "kokand-demo", name: "Akmal Jo'rayev", specialty: "Terapevt", room: "8", minutes: 20, langs: ["uz", "ru", "en"] },
  { slug: "jasur-rahimov", clinic: "fergana-demo", name: "Jasur Rahimov", specialty: "Nevrolog", room: "211", minutes: 30, langs: ["uz", "ru"] },
  { slug: "malika-yusupova", clinic: "fergana-demo", name: "Malika Yusupova", specialty: "Kardiolog", room: "205", minutes: 30, langs: ["uz", "ru", "en"] },
  { slug: "shahnoza-ergasheva", clinic: "fergana-demo", name: "Shahnoza Ergasheva", specialty: "Ginekolog", room: "118", minutes: 30, langs: ["uz", "ru"] },
  { slug: "rustam-xolmatov", clinic: "fergana-demo", name: "Rustam Xolmatov", specialty: "Endokrinolog", room: "214", minutes: 30, langs: ["uz", "ru"] },
  { slug: "bobur-tursunov", clinic: "margilan-demo", name: "Bobur Tursunov", specialty: "LOR", room: "21", minutes: 20, langs: ["uz", "ru"] },
  { slug: "gulnora-ismoilova", clinic: "margilan-demo", name: "Gulnora Ismoilova", specialty: "Pediatr", room: "5", minutes: 20, langs: ["uz", "ru"] },
  { slug: "kamola-mirzayeva", clinic: "margilan-demo", name: "Kamola Mirzayeva", specialty: "Gastroenterolog", room: "17", minutes: 30, langs: ["uz", "ru", "en"] },
  { slug: "sardor-aliyev", clinic: "kokand-demo", name: "Sardor Aliyev", specialty: "Oftalmolog", room: "14", minutes: 20, langs: ["uz", "ru"] },
  { slug: "nilufar-saidova", clinic: "kokand-demo", name: "Nilufar Saidova", specialty: "Dermatolog", room: "19", minutes: 20, langs: ["uz", "ru"] },
  { slug: "otabek-nazarov", clinic: "kokand-demo", name: "Otabek Nazarov", specialty: "Travmatolog", room: "2", minutes: 20, langs: ["uz", "ru"] },
  { slug: "farrux-abdullayev", clinic: "kokand-demo", name: "Farrux Abdullayev", specialty: "Urolog", room: "23", minutes: 30, langs: ["uz", "ru"] },
];

const SEED_PATIENTS = [
  { name: "Madina Xasanova", phone: "+998000000101", symptoms: "3 kundan beri harorat 38, yo'tal va holsizlik.", spec: "Terapevt", urg: "soon" },
  { name: "Sherzod Umarov", phone: "+998000000102", symptoms: "Bosim tez-tez ko'tariladi, ertalab boshim og'riydi.", spec: "Terapevt", urg: "routine" },
  { name: "Zarina Qosimova", phone: "+998000000103", symptoms: "Tomog'im og'riyapti, yutishda qiynalaman.", spec: "LOR", urg: "routine" },
  { name: "Javohir Mamatov", phone: "+998000000104", symptoms: "Umumiy ko'rikdan o'tmoqchiman, tahlillar uchun yo'llanma kerak.", spec: "Terapevt", urg: "routine" },
  { name: "Feruza Normatova", phone: "+998000000105", symptoms: "Kechasi yo'talib chiqaman, 5 kundan beri o'tmayapti.", spec: "Terapevt", urg: "soon" },
  { name: "Ulug'bek Sharipov", phone: "+998000000106", symptoms: "Ovqatdan keyin oshqozonim og'riydi, ko'ngil aynaydi.", spec: "Gastroenterolog", urg: "routine" },
] as const;

export const DEMO_PRESCRIPTION = `Tavsiyalar:
1. Paratsetamol 500 mg — 1 tabletkadan kuniga 3 mahal, ovqatdan keyin, 5 kun (harorat 38°C dan oshganda).
2. Ko'p iliq suyuqlik iching (kuniga 2 litrgacha).
3. Tomoqni iliq tuzli suv bilan kuniga 4 mahal chaying.
4. 3 kun uyda dam oling.
Nazorat ko'rigi: 7 kundan keyin. Harorat 3 kundan ortiq tushmasa yoki nafas qisishi paydo bo'lsa — darhol murojaat qiling.`;

const SEED_NOTE = `Tavsiyalar:
1. Ibuprofen 200 mg — kerak bo'lganda 1 tabletka, ovqatdan keyin, kuniga 2 mahaldan ko'p emas.
2. Kuniga 7–8 soat uxlang, ekran oldida kam o'tiring.
Qon bosimini 1 hafta davomida ertalab va kechqurun o'lchab, daftarga yozing. Natijalar bilan 7 kundan keyin keling.`;

/** Deterministic PRNG so reseeds look the same. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Wipes demo data and rebuilds it. Real (Google) users are kept; all appointments are reset. */
export async function reseed(db: Db): Promise<{ slots: number; appointments: number }> {
  await db.query("delete from hs.visit_notes");
  await db.query("delete from hs.appointments");
  await db.query("delete from hs.slots");
  await db.query("delete from hs.users where is_demo");

  for (const c of CLINICS) {
    await db.query(
      `insert into hs.clinics (slug, name, city, address, phone) values ($1,$2,$3,$4,$5)
       on conflict (slug) do update set name = excluded.name, city = excluded.city, address = excluded.address, phone = excluded.phone`,
      [c.slug, c.name, c.city, c.address, c.phone],
    );
  }
  let i = 0;
  for (const d of DOCTORS) {
    i++;
    const clinic = CLINICS.find((c) => c.slug === d.clinic)!;
    await db.query(
      `insert into hs.doctors (slug, clinic_id, full_name, specialty, room, contact_phone, languages, slot_minutes)
       values ($1, (select id from hs.clinics where slug = $2), $3, $4, $5, $6, $7, $8)
       on conflict (slug) do update set clinic_id = excluded.clinic_id, full_name = excluded.full_name,
         specialty = excluded.specialty, room = excluded.room, contact_phone = excluded.contact_phone,
         languages = excluded.languages, slot_minutes = excluded.slot_minutes`,
      [d.slug, d.clinic, d.name, d.specialty, d.room, `${clinic.phone.slice(0, -2)}${String(10 + i).padStart(2, "0")}`, d.langs, d.minutes],
    );
  }

  // Demo doctor account (low privilege: sees only Dr. Karimova's appointments).
  const doc = await db.query<{ id: string }>(
    `insert into hs.users (email, full_name, role, is_demo) values ($1, 'Dilnoza Karimova (demo)', 'doctor', true) returning id`,
    [DEMO_DOCTOR_EMAIL],
  );
  await db.query("update hs.doctors set user_id = $1 where slug = $2", [doc.rows[0]!.id, DEMO_DOCTOR_SLUG]);

  const slotRes = await db.query<{ n: number }>("select hs.generate_slots(14) as n");

  // Fictional patients for the demo doctor's schedule.
  const patientIds: string[] = [];
  for (const p of SEED_PATIENTS) {
    const r = await db.query<{ id: string }>(
      "insert into hs.users (full_name, phone, role, is_demo) values ($1, $2, 'patient', true) returning id",
      [p.name, p.phone],
    );
    patientIds.push(r.rows[0]!.id);
  }

  const demoDoctor = await db.query<{ id: string }>("select id from hs.doctors where slug = $1", [DEMO_DOCTOR_SLUG]);
  const demoDoctorId = demoDoctor.rows[0]!.id;

  // Next working day with slots (today if it is Mon–Sat).
  const days = await db.query<{ day: string }>(
    `select distinct (starts_at at time zone 'Asia/Tashkent')::date::text as day
     from hs.slots where doctor_id = $1 order by 1 limit 6`,
    [demoDoctorId],
  );
  let appts = 0;
  const pick = [0, 2, 4, 7, 14, 18];
  for (let di = 0; di < days.rows.length; di++) {
    const day = days.rows[di]!.day;
    const daySlots = await db.query<{ id: string; starts_at: Date }>(
      `select id, starts_at from hs.slots where doctor_id = $1 and (starts_at at time zone 'Asia/Tashkent')::date = $2::date order by starts_at`,
      [demoDoctorId, day],
    );
    const indexes = di === 0 ? pick : [1, 9, 16].slice(0, di < 3 ? 3 : 2);
    for (let k = 0; k < indexes.length; k++) {
      const slot = daySlots.rows[indexes[k]!];
      if (!slot) continue;
      const pIdx = (di * 3 + k) % SEED_PATIENTS.length;
      const p = SEED_PATIENTS[pIdx]!;
      const past = slot.starts_at.getTime() < Date.now();
      const a = await db.query<{ id: string }>(
        `insert into hs.appointments (slot_id, doctor_id, patient_id, patient_name, patient_phone, symptoms, ai_specialty, ai_urgency, status)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
        [slot.id, demoDoctorId, patientIds[pIdx], p.name, p.phone, p.symptoms, p.spec, p.urg, past ? "completed" : "booked"],
      );
      if (past) {
        await db.query(
          `insert into hs.visit_notes (appointment_id, doctor_id, recommendations, created_at, updated_at)
           select $1, $2, $3, s.ends_at, s.ends_at from hs.slots s where s.id = $4`,
          [a.rows[0]!.id, demoDoctorId, SEED_NOTE, slot.id],
        );
      }
      appts++;
    }
  }

  // Make the calendar realistic: ~22% of other future slots are already taken.
  const rand = mulberry32(20261115);
  const others = await db.query<{ id: string; doctor_id: string }>(
    "select id, doctor_id from hs.slots where doctor_id <> $1 and starts_at > now() order by doctor_id, starts_at",
    [demoDoctorId],
  );
  for (const s of others.rows) {
    if (rand() < 0.22) {
      const pIdx = Math.floor(rand() * SEED_PATIENTS.length);
      const p = SEED_PATIENTS[pIdx]!;
      await db.query(
        `insert into hs.appointments (slot_id, doctor_id, patient_id, patient_name, patient_phone, symptoms, status)
         values ($1,$2,$3,$4,$5,'', 'booked')`,
        [s.id, s.doctor_id, patientIds[pIdx], p.name, p.phone],
      );
      appts++;
    }
  }

  return { slots: slotRes.rows[0]!.n, appointments: appts };
}

/**
 * Creates a fresh, isolated demo patient with one past visit (with the demo
 * doctor's written recommendations) so the post-visit explainer can be tried
 * immediately. Owner context only.
 */
export async function provisionDemoPatient(db: Db): Promise<string> {
  const user = await db.query<{ id: string }>(
    "insert into hs.users (full_name, role, is_demo) values ('Demo bemor', 'patient', true) returning id",
  );
  const userId = user.rows[0]!.id;
  const doctor = await db.query<{ id: string }>("select id from hs.doctors where slug = $1", [DEMO_DOCTOR_SLUG]);
  const doctorId = doctor.rows[0]?.id;
  if (!doctorId) return userId;

  for (let attempt = 0; attempt < 12; attempt++) {
    const slot = await db.query<{ id: string }>(
      `insert into hs.slots (doctor_id, starts_at, ends_at)
       select $1, t, t + interval '20 minutes'
       from (select (((now() at time zone 'Asia/Tashkent')::date - (8 + floor(random() * 4))::int) + time '09:00'
                     + make_interval(mins => floor(random() * 420)::int)) at time zone 'Asia/Tashkent' as t) x
       on conflict (doctor_id, starts_at) do nothing
       returning id`,
      [doctorId],
    );
    const slotId = slot.rows[0]?.id;
    if (!slotId) continue;
    const appt = await db.query<{ id: string }>(
      `insert into hs.appointments (slot_id, doctor_id, patient_id, patient_name, patient_phone, symptoms, ai_specialty, ai_urgency, status)
       values ($1, $2, $3, 'Demo bemor', '+998000000000', $4, 'Terapevt', 'routine', 'completed') returning id`,
      [slotId, doctorId, userId, "2 kundan beri harorat 38.2, tomoq og'rig'i va holsizlik."],
    );
    await db.query(
      `insert into hs.visit_notes (appointment_id, doctor_id, recommendations, created_at, updated_at)
       select $1, $2, $3, s.ends_at, s.ends_at from hs.slots s where s.id = $4`,
      [appt.rows[0]!.id, doctorId, DEMO_PRESCRIPTION, slotId],
    );
    break;
  }
  return userId;
}
