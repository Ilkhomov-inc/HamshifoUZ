import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, CalendarDays, FileText, MapPin } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppointment } from "@/lib/data/appointments";
import { formatDate, formatTime } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ExplainerChat } from "@/components/ai/explainer-chat";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.appointment.recommendations };
}

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?returnTo=/appointments/${parsed.data}`);
  if (user.role === "doctor") redirect(`/doctor/appointments/${parsed.data}`);
  const [{ t, locale }, a] = await Promise.all([getI18n(), getAppointment(user.id, parsed.data)]);
  if (!a) notFound(); // RLS: other users' appointments are simply invisible

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/appointments" className={buttonClass("ghost", "sm", "-ml-3")}>
        <ArrowLeft aria-hidden className="btn-arrow-back size-4" /> {t.appointments.title}
      </Link>
      <Card className="mt-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={a.status === "booked" ? "brand" : "neutral"}>{t.status[a.status]}</Badge>
          <Badge tone="outline">{t.specialties[a.doctor.specialty].name}</Badge>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{a.doctor.fullName}</h1>
        <div className="mt-3 grid gap-2 text-sm text-ink-2 sm:grid-cols-2">
          <p className="flex items-start gap-2">
            <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
            <span className="first-letter:uppercase">
              {formatDate(a.startsAt, locale)}, {formatTime(a.startsAt)}
            </span>
          </p>
          <p className="flex items-start gap-2">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
            <span>
              {a.clinic.name}, {t.common.room} {a.doctor.room}
            </span>
          </p>
        </div>
        {a.symptoms && (
          <div className="mt-4 rounded-xl bg-canvas p-4 text-sm ring-1 ring-line">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t.appointment.yourSymptoms}</p>
            <p className="mt-1 whitespace-pre-wrap text-ink-2">{a.symptoms}</p>
          </div>
        )}
      </Card>

      <section className="mt-6" aria-labelledby="recs-h">
        <h2 id="recs-h" className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <FileText aria-hidden className="size-5 text-brand-600" /> {t.appointment.recommendations}
        </h2>
        {a.note ? (
          <>
            <Card className="p-5 sm:p-6">
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink">{a.note.recommendations}</p>
              <p className="mt-4 text-xs text-muted">
                — {a.doctor.fullName}, {formatDate(a.note.updatedAt, locale, { weekday: undefined })}
              </p>
            </Card>
            <div className="mt-5">
              <ExplainerChat
                appointmentId={a.id}
                followUpHref={`/book?doctor=${a.doctor.id}`}
                contact={{
                  name: a.doctor.fullName,
                  specialty: t.specialties[a.doctor.specialty].name,
                  phone: a.doctor.contactPhone,
                  room: a.doctor.room,
                  clinic: a.clinic.name,
                  address: a.clinic.address,
                }}
              />
            </div>
          </>
        ) : (
          <Card className="p-6 text-sm text-muted">{t.appointment.noRecommendations}</Card>
        )}
      </section>
    </div>
  );
}
