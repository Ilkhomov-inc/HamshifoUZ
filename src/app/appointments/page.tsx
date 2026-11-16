import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, FileText, MapPin } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listMyAppointments, type AppointmentView } from "@/lib/data/appointments";
import { dateKey, formatTime, isoWeekday, monthName, weekdayName, type Locale } from "@/lib/time";
import type { Dict } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CancelButton } from "@/components/appointments/cancel-button";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.appointments.title };
}

function statusTone(s: AppointmentView["status"]) {
  return s === "booked" ? "brand" : s === "completed" ? "neutral" : s === "cancelled" ? "outline" : "warm";
}

function Row({ a, t, locale, upcoming }: { a: AppointmentView; t: Dict; locale: Locale; upcoming: boolean }) {
  const key = dateKey(a.startsAt);
  const day = Number(key.slice(8));
  const mon = monthName(Number(key.slice(5, 7)), locale, "short");
  const wd = weekdayName(isoWeekday(key), locale, "long");
  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-4 sm:min-w-[16rem]">
        <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-canvas py-2 ring-1 ring-line">
          <span className="text-[11px] font-semibold text-brand-700 uppercase">{mon}</span>
          <span className="text-xl leading-tight font-semibold tabular-nums">{day}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted first-letter:uppercase">
            {wd} · {formatTime(a.startsAt)}–{formatTime(a.endsAt)}
          </p>
          <p className="font-semibold break-words text-ink">
            {a.doctor.fullName} <span className="font-normal text-muted">· {t.specialties[a.doctor.specialty].name}</span>
          </p>
          <p className="mt-0.5 flex items-start gap-1 text-[13px] text-ink-2">
            <MapPin aria-hidden className="mt-[3px] size-3.5 shrink-0" />
            <span className="min-w-0 break-words">
              {a.clinic.name} · {t.common.room} {a.doctor.room}
            </span>
          </p>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:max-w-[23rem] sm:justify-end">
        <Badge tone={statusTone(a.status)}>{t.status[a.status]}</Badge>
        {upcoming && a.status === "booked" && <CancelButton id={a.id} />}
        <ButtonLink href={`/appointments/${a.id}`} variant={a.hasNote ? "soft" : "ghost"} size="sm" title={a.hasNote ? t.appointments.recsReady : undefined}>
          {a.hasNote && <FileText aria-hidden className="size-4" />}
          {a.hasNote ? t.appointments.viewRecs : t.appointments.details} <ChevronRight aria-hidden className="btn-arrow size-4" />
        </ButtonLink>
      </div>
    </Card>
  );
}

export default async function AppointmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?returnTo=/appointments");
  if (user.role === "doctor") redirect("/doctor");
  const [{ t, locale }, list] = await Promise.all([getI18n(), listMyAppointments(user.id)]);
  const now = Date.now();
  const upcoming = list.filter((a) => a.status === "booked" && new Date(a.startsAt).getTime() > now).reverse();
  const past = list.filter((a) => !upcoming.includes(a));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t.appointments.title}</h1>
          <p className="mt-1 text-muted">{t.appointments.subtitle}</p>
        </div>
        <ButtonLink href="/book" variant="warm">
          {t.nav.book}
        </ButtonLink>
      </div>

      <section className="mt-8" aria-labelledby="up-h">
        <h2 id="up-h" className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
          {t.appointments.upcoming}
        </h2>
        {upcoming.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted">{t.appointments.empty}</p>
            <ButtonLink href="/book" variant="outline" className="mt-4">
              {t.appointments.emptyCta}
            </ButtonLink>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <Row key={a.id} a={a} t={t} locale={locale} upcoming />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-10" aria-labelledby="past-h">
          <h2 id="past-h" className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
            {t.appointments.past}
          </h2>
          <div className="space-y-3">
            {past.map((a) => (
              <Row key={a.id} a={a} t={t} locale={locale} upcoming={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
