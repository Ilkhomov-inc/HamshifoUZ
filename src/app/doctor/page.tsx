import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import { doctorSchedule, type AppointmentView } from "@/lib/data/appointments";
import { getDoctor } from "@/lib/data/catalog";
import { addDays, dateKey, formatDateKey, formatTime, startOfWeek, type Locale, formatPhone } from "@/lib/time";
import { fmt, type Dict } from "@/lib/i18n";
import { dateKeySchema } from "@/lib/validation";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NotDoctor } from "./not-doctor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.doctor.title, robots: { index: false } };
}

const statusTone = { booked: "brand", completed: "neutral", cancelled: "outline", no_show: "warm" } as const;

function ApptCard({ a, t, compact = false }: { a: AppointmentView; t: Dict; compact?: boolean }) {
  return (
    <Link
      href={`/doctor/appointments/${a.id}`}
      className={cn(
        "group block rounded-xl border border-line bg-surface transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card",
        compact ? "p-3" : "p-4 sm:p-5",
        a.status === "completed" && "opacity-75",
      )}
    >
      <div className={cn("flex min-w-0 items-start", compact ? "flex-col gap-1" : "gap-3")}>
        {compact ? (
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-sm font-semibold tabular-nums text-ink">{formatTime(a.startsAt)}</span>
            <Badge tone={statusTone[a.status]} className="min-w-0">
              <span className="truncate">{t.status[a.status]}</span>
            </Badge>
          </div>
        ) : (
          <span className="w-14 shrink-0 text-base font-semibold tabular-nums text-ink">{formatTime(a.startsAt)}</span>
        )}
        <div className="w-full min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("min-w-0 font-semibold text-ink", compact ? "line-clamp-2 text-sm wrap-anywhere" : "truncate")} title={a.patientName}>
              {a.patientName}
            </span>
            {!compact && <Badge tone={statusTone[a.status]}>{t.status[a.status]}</Badge>}
          </div>
          {!compact && <p className="text-[13px] text-muted tabular-nums">{formatPhone(a.patientPhone)}</p>}
          <p className={cn("mt-1.5 text-sm wrap-anywhere text-ink-2", compact ? "line-clamp-2" : "line-clamp-3")}>{a.symptoms || <span className="text-muted italic">{t.doctor.noSymptoms}</span>}</p>
          {a.aiSpecialty && (
            <p className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone="brand" className="min-w-0" title={`${t.doctor.aiSuggestion}: ${t.specialties[a.aiSpecialty].name}`}>
                <Sparkles aria-hidden className="size-3 shrink-0" />
                <span className="truncate">
                  {compact ? "" : `${t.doctor.aiSuggestion}: `}
                  {t.specialties[a.aiSpecialty].name}
                </span>
              </Badge>
              {a.aiUrgency && a.aiUrgency !== "routine" && (
                <Badge tone={a.aiUrgency === "emergency" ? "danger" : "warm"} className="min-w-0" title={t.urgency[a.aiUrgency]}>
                  <span className="truncate">{t.urgency[a.aiUrgency]}</span>
                </Badge>
              )}
            </p>
          )}
        </div>
        {!compact && <ChevronRight aria-hidden className="mt-1 size-4 text-muted transition-transform group-hover:translate-x-0.5" />}
      </div>
    </Link>
  );
}

export default async function DoctorPage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/signin?returnTo=/doctor");
  const { t, locale } = await getI18n();
  if (user.role !== "doctor" || !user.doctorId) return <NotDoctor t={t} />;

  const view = sp.view === "week" ? "week" : "day";
  const today = dateKey(new Date());
  const date = dateKeySchema.safeParse(sp.date).success ? sp.date! : today;
  const from = view === "week" ? startOfWeek(date) : date;
  const to = addDays(from, view === "week" ? 7 : 1);
  const step = view === "week" ? 7 : 1;
  const [list, me] = await Promise.all([doctorSchedule(user.id, from, to), getDoctor(user.id, user.doctorId)]);

  const href = (v: string, d: string) => `/doctor?view=${v}&date=${d}`;
  const rangeLabel =
    view === "week"
      ? `${formatDateKey(from, locale as Locale, { weekday: undefined, month: "short" })} – ${formatDateKey(addDays(from, 5), locale as Locale, { weekday: undefined, month: "short" })}`
      : formatDateKey(date, locale as Locale);

  const days = view === "week" ? Array.from({ length: 6 }, (_, i) => addDays(from, i)) : [date];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted">
            {me?.fullName} · {me ? t.specialties[me.specialty].name : ""} · {me?.clinic.name}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t.doctor.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="segmented" role="group" aria-label={`${t.doctor.day} / ${t.doctor.week}`}>
            <Link href={href("day", date)} aria-current={view === "day" ? "page" : undefined} className="segmented-item inline-flex items-center">
              {t.doctor.day}
            </Link>
            <Link href={href("week", date)} aria-current={view === "week" ? "page" : undefined} className="segmented-item inline-flex items-center">
              {t.doctor.week}
            </Link>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1">
            <Link href={href(view, addDays(date, -step))} aria-label={t.doctor.prev} className={buttonClass("ghost", "icon-sm")}>
              <ChevronLeft aria-hidden className="size-4" />
            </Link>
            <Link href={href(view, today)} className={buttonClass("ghost", "sm")}>
              {t.doctor.today}
            </Link>
            <Link href={href(view, addDays(date, step))} aria-label={t.doctor.next} className={buttonClass("ghost", "icon-sm")}>
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-baseline justify-between border-b border-line pb-3">
        <h2 className="text-lg font-semibold first-letter:uppercase">{rangeLabel}</h2>
        <p className="text-sm text-muted">{fmt(t.doctor.count, { count: list.length })}</p>
      </div>

      {view === "day" ? (
        <div className="mt-5 space-y-3">
          {list.length === 0 ? <Card className="p-8 text-center text-sm text-muted">{t.doctor.empty}</Card> : list.map((a) => <ApptCard key={a.id} a={a} t={t} />)}
        </div>
      ) : list.length === 0 ? (
        <Card className="mt-5 p-8 text-center text-sm text-muted">{t.doctor.emptyWeek}</Card>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {days.map((d) => {
            const items = list.filter((a) => dateKey(a.startsAt) === d);
            return (
              <section key={d} aria-label={formatDateKey(d, locale as Locale)} className={cn("min-w-0 rounded-2xl border border-line bg-canvas/70 p-2.5", d === today && "border-brand-300 bg-brand-50/50")}>
                <Link href={href("day", d)} className="mb-2 flex items-baseline justify-between rounded-lg px-1.5 py-1 hover:bg-ink/5">
                  <span className="text-sm font-semibold first-letter:uppercase">{formatDateKey(d, locale as Locale, { month: undefined, day: "numeric", weekday: "short" })}</span>
                  <span className="text-xs text-muted tabular-nums">{items.length}</span>
                </Link>
                <div className="space-y-2">
                  {items.map((a) => (
                    <ApptCard key={a.id} a={a} t={t} compact />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
