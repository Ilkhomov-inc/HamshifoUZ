import { withRls } from "../db";
import type { Specialty } from "../ai/specialties";
import { startOfDay } from "../time";

/** All functions here run as the signed-in user under Postgres RLS. */

export type AppointmentView = {
  id: string;
  status: "booked" | "completed" | "cancelled" | "no_show";
  startsAt: string;
  endsAt: string;
  patientName: string;
  patientPhone: string;
  symptoms: string;
  aiSpecialty: Specialty | null;
  aiUrgency: "routine" | "soon" | "emergency" | null;
  doctor: { id: string; fullName: string; specialty: Specialty; room: string; contactPhone: string };
  clinic: { name: string; city: string; address: string; phone: string };
  hasNote: boolean;
  note?: { recommendations: string; updatedAt: string } | null;
};

type Row = {
  id: string;
  status: AppointmentView["status"];
  starts_at: Date;
  ends_at: Date;
  patient_name: string;
  patient_phone: string;
  symptoms: string;
  ai_specialty: Specialty | null;
  ai_urgency: AppointmentView["aiUrgency"];
  doctor_id: string;
  doctor_name: string;
  specialty: Specialty;
  room: string;
  contact_phone: string;
  clinic_name: string;
  city: string;
  address: string;
  clinic_phone: string;
  recommendations: string | null;
  note_updated_at: Date | null;
};

const SELECT = `
  select a.id, a.status, s.starts_at, s.ends_at, a.patient_name, a.patient_phone, a.symptoms,
         a.ai_specialty, a.ai_urgency,
         d.id as doctor_id, d.full_name as doctor_name, d.specialty, d.room, d.contact_phone,
         c.name as clinic_name, c.city, c.address, c.phone as clinic_phone,
         n.recommendations, n.updated_at as note_updated_at
  from hs.appointments a
  join hs.slots s on s.id = a.slot_id
  join hs.doctors d on d.id = a.doctor_id
  join hs.clinics c on c.id = d.clinic_id
  left join hs.visit_notes n on n.appointment_id = a.id`;

function toView(r: Row, withNote: boolean): AppointmentView {
  return {
    id: r.id,
    status: r.status,
    startsAt: r.starts_at.toISOString(),
    endsAt: r.ends_at.toISOString(),
    patientName: r.patient_name,
    patientPhone: r.patient_phone,
    symptoms: r.symptoms,
    aiSpecialty: r.ai_specialty,
    aiUrgency: r.ai_urgency,
    doctor: { id: r.doctor_id, fullName: r.doctor_name, specialty: r.specialty, room: r.room, contactPhone: r.contact_phone },
    clinic: { name: r.clinic_name, city: r.city, address: r.address, phone: r.clinic_phone },
    hasNote: Boolean(r.recommendations),
    note: withNote && r.recommendations ? { recommendations: r.recommendations, updatedAt: r.note_updated_at!.toISOString() } : null,
  };
}

export async function listMyAppointments(userId: string): Promise<AppointmentView[]> {
  return withRls(userId, async (db) => {
    const r = await db.query<Row>(`${SELECT} where a.patient_id = hs.uid() order by s.starts_at desc limit 100`);
    return r.rows.map((row) => toView(row, false));
  });
}

/** Returns the appointment only if RLS lets this user see it (patient or its doctor). */
export async function getAppointment(userId: string, id: string): Promise<AppointmentView | null> {
  return withRls(userId, async (db) => {
    const r = await db.query<Row>(`${SELECT} where a.id = $1`, [id]);
    return r.rows[0] ? toView(r.rows[0], true) : null;
  });
}

export type BookResult = { code: "ok" | "slot_taken" | "too_late" | "limit_reached" | "not_found" | "unauthenticated"; id?: string };

export async function bookAppointment(
  userId: string,
  input: { slotId: string; name: string; phone: string; symptoms: string; aiSpecialty?: string | null; aiUrgency?: string | null },
): Promise<BookResult> {
  return withRls(userId, async (db) => {
    const r = await db.query<{ result_code: BookResult["code"]; result_id: string | null }>(
      "select result_code, result_id from hs.book_appointment($1, $2, $3, $4, $5, $6)",
      [input.slotId, input.name, input.phone, input.symptoms, input.aiSpecialty ?? "", input.aiUrgency ?? ""],
    );
    const row = r.rows[0]!;
    return { code: row.result_code, id: row.result_id ?? undefined };
  });
}

export async function cancelAppointment(userId: string, id: string): Promise<"ok" | "not_found" | "too_late"> {
  try {
    return await withRls(userId, async (db) => {
      const r = await db.query(
        "update hs.appointments set status = 'cancelled' where id = $1 and patient_id = hs.uid() and status = 'booked'",
        [id],
      );
      return r.rowCount ? "ok" : "not_found";
    });
  } catch (err) {
    if ((err as Error).message.includes("too_late")) return "too_late";
    throw err;
  }
}

export async function doctorSchedule(userId: string, fromKey: string, toKeyExclusive: string): Promise<AppointmentView[]> {
  return withRls(userId, async (db) => {
    const r = await db.query<Row>(
      `${SELECT}
       where a.doctor_id = hs.current_doctor_id()
         and s.starts_at >= $1 and s.starts_at < $2
         and a.status <> 'cancelled'
       order by s.starts_at`,
      [startOfDay(fromKey), startOfDay(toKeyExclusive)],
    );
    return r.rows.map((row) => toView(row, false));
  });
}

export async function saveVisitNote(
  userId: string,
  id: string,
  recommendations: string | null,
  status: "completed" | "booked" | "no_show",
): Promise<"ok" | "not_found"> {
  return withRls(userId, async (db) => {
    const doc = await db.query<{ id: string | null }>("select hs.current_doctor_id() as id");
    const doctorId = doc.rows[0]?.id;
    if (!doctorId) return "not_found";
    const appt = await db.query<{ id: string }>("select id from hs.appointments where id = $1 and doctor_id = $2", [id, doctorId]);
    if (!appt.rows[0]) return "not_found";
    if (recommendations !== null) {
      await db.query(
        `insert into hs.visit_notes (appointment_id, doctor_id, recommendations) values ($1, $2, $3)
         on conflict (appointment_id) do update set recommendations = excluded.recommendations`,
        [id, doctorId, recommendations],
      );
    }
    await db.query("update hs.appointments set status = $2 where id = $1", [id, status]);
    return "ok";
  });
}
