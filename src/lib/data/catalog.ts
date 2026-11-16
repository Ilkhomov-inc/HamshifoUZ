import { withRls } from "../db";
import type { Specialty } from "../ai/specialties";
import { addDays, startOfDay } from "../time";

export type DoctorCard = {
  id: string;
  fullName: string;
  specialty: Specialty;
  room: string;
  contactPhone: string;
  languages: string[];
  slotMinutes: number;
  clinic: { id: string; name: string; city: string; address: string; phone: string };
  nextSlot: string | null;
  free7d: number;
};

type DoctorRow = {
  id: string;
  full_name: string;
  specialty: Specialty;
  room: string;
  contact_phone: string;
  languages: string[];
  slot_minutes: number;
  clinic_id: string;
  clinic_name: string;
  city: string;
  address: string;
  clinic_phone: string;
};

const DOCTOR_SELECT = `
  select d.id, d.full_name, d.specialty, d.room, d.contact_phone, d.languages, d.slot_minutes,
         c.id as clinic_id, c.name as clinic_name, c.city, c.address, c.phone as clinic_phone
  from hs.doctors d join hs.clinics c on c.id = d.clinic_id`;

function toCard(r: DoctorRow, avail?: { next_slot: Date | null; free_7d: number }): DoctorCard {
  return {
    id: r.id,
    fullName: r.full_name,
    specialty: r.specialty,
    room: r.room,
    contactPhone: r.contact_phone,
    languages: r.languages,
    slotMinutes: r.slot_minutes,
    clinic: { id: r.clinic_id, name: r.clinic_name, city: r.city, address: r.address, phone: r.clinic_phone },
    nextSlot: avail?.next_slot ? avail.next_slot.toISOString() : null,
    free7d: avail?.free_7d ?? 0,
  };
}

export async function listDoctors(userId: string | null, filter: { specialty?: Specialty; city?: string }): Promise<DoctorCard[]> {
  return withRls(userId, async (db) => {
    const rows = await db.query<DoctorRow>(
      `${DOCTOR_SELECT}
       where ($1::text is null or d.specialty = $1::text)
         and ($2::text is null or c.city = $2::text)
       order by d.full_name`,
      [filter.specialty ?? null, filter.city ?? null],
    );
    if (rows.rows.length === 0) return [];
    const avail = await db.query<{ doctor_id: string; next_slot: Date | null; free_7d: number }>(
      "select doctor_id, next_slot, free_7d from hs.doctor_availability($1::uuid[])",
      [rows.rows.map((r) => r.id)],
    );
    const map = new Map(avail.rows.map((a) => [a.doctor_id, a]));
    return rows.rows
      .map((r) => toCard(r, map.get(r.id)))
      .sort((a, b) => (a.nextSlot ?? "9999").localeCompare(b.nextSlot ?? "9999"));
  });
}

export async function getDoctor(userId: string | null, id: string): Promise<DoctorCard | null> {
  return withRls(userId, async (db) => {
    const r = await db.query<DoctorRow>(`${DOCTOR_SELECT} where d.id = $1`, [id]);
    if (!r.rows[0]) return null;
    const avail = await db.query<{ next_slot: Date | null; free_7d: number }>(
      "select next_slot, free_7d from hs.doctor_availability(array[$1::uuid])",
      [id],
    );
    return toCard(r.rows[0], avail.rows[0]);
  });
}

export type FreeSlot = { id: string; startsAt: string; endsAt: string };

export async function availableSlots(userId: string | null, doctorId: string, fromKey: string, days: number): Promise<FreeSlot[]> {
  return withRls(userId, async (db) => {
    const r = await db.query<{ slot_id: string; starts_at: Date; ends_at: Date }>(
      "select slot_id, starts_at, ends_at from hs.available_slots($1, $2, $3)",
      [doctorId, startOfDay(fromKey), startOfDay(addDays(fromKey, days))],
    );
    return r.rows.map((s) => ({ id: s.slot_id, startsAt: s.starts_at.toISOString(), endsAt: s.ends_at.toISOString() }));
  });
}
