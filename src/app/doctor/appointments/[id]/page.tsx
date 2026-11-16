import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, CalendarDays, Info, Phone, Sparkles } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppointment } from "@/lib/data/appointments";
import { dateKey, formatDate, formatTime, formatPhone } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { NoteForm } from "@/components/doctor/note-form";
import { NotDoctor } from "../../not-doctor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.doctor.title, robots: { index: false } };
}

export default async function DoctorAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?returnTo=/doctor/appointments/${parsed.data}`);
  const { t, locale } = await getI18n();
  if (user.role !== "doctor" || !user.doctorId) return <NotDoctor t={t} />;
  const a = await getAppointment(user.id, parsed.data);
  if (!a || a.doctor.id !== user.doctorId) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href={`/doctor?view=day&date=${dateKey(a.startsAt)}`} className={buttonClass("ghost", "sm", "-ml-3")}>
        <ArrowLeft aria-hidden className="btn-arrow-back size-4" /> {t.doctor.backToSchedule}
      </Link>
      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <Card className="h-fit p-5 sm:p-6">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t.doctor.patient}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{a.patientName}</h1>
          <a href={`tel:${a.patientPhone}`} className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
            <Phone aria-hidden className="size-3.5" /> {formatPhone(a.patientPhone)}
          </a>
          <p className="mt-4 flex items-start gap-2 text-sm text-ink-2">
            <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
            <span className="first-letter:uppercase">
              {formatDate(a.startsAt, locale)}, {formatTime(a.startsAt)}–{formatTime(a.endsAt)}
            </span>
          </p>
          <div className="mt-2">
            <Badge tone={a.status === "booked" ? "brand" : a.status === "no_show" ? "warm" : "neutral"}>{t.status[a.status]}</Badge>
          </div>

          <div className="mt-5 rounded-xl bg-canvas p-4 ring-1 ring-line">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t.doctor.symptoms}</p>
            <p className="mt-1.5 text-[15px] whitespace-pre-wrap text-ink">{a.symptoms || <span className="text-muted italic">{t.doctor.noSymptoms}</span>}</p>
          </div>
          {a.aiSpecialty && (
            <div className="mt-3 rounded-xl bg-brand-50/70 p-4 ring-1 ring-brand-100">
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-brand-700 uppercase">
                <Sparkles aria-hidden className="size-3.5" /> {t.doctor.aiSuggestion}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 font-semibold text-ink">
                {t.specialties[a.aiSpecialty].name}
                {a.aiUrgency && <Badge tone={a.aiUrgency === "routine" ? "neutral" : a.aiUrgency === "soon" ? "warm" : "danger"}>{t.urgency[a.aiUrgency]}</Badge>}
              </p>
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
                <Info aria-hidden className="mt-px size-3.5 shrink-0" /> {t.doctor.aiNote}
              </p>
            </div>
          )}
        </Card>
        <Card className="p-5 sm:p-6">
          <NoteForm id={a.id} initial={a.note?.recommendations ?? ""} status={a.status} />
        </Card>
      </div>
    </div>
  );
}
