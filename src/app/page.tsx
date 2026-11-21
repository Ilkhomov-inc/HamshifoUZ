import {
  ArrowRight,
  BellRing,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  FileText,
  LockKeyhole,
  MessageSquareText,
  Phone,
  Pill,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  UserRoundSearch,
} from "lucide-react";
import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import { HeroWidget } from "@/components/landing/hero-widget";
import { NotifyForm } from "@/components/landing/notify-form";
import { HamdardAvatar } from "@/components/ai/avatar";
import { DemoButtons } from "@/components/auth/demo-buttons";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { demoEnabled } from "@/lib/auth/demo";

const STEP_ICONS = [MessageSquareText, UserRoundSearch, CalendarCheck2, CheckCircle2];

function SectionHead({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="reveal mx-auto max-w-2xl text-center">
      {eyebrow && <p className="text-sm font-semibold text-brand-600">{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-base text-pretty text-muted sm:text-lg">{subtitle}</p>}
    </div>
  );
}

export default async function LandingPage() {
  const [{ t }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const L = t.landing;

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 -left-32 size-[560px] animate-float-a rounded-full bg-[radial-gradient(closest-side,var(--color-brand-200),transparent)] opacity-70 will-change-transform" />
          <div className="absolute top-10 right-[-180px] size-[620px] animate-float-b rounded-full bg-[radial-gradient(closest-side,var(--color-warm-200),transparent)] opacity-60 will-change-transform" />
          <div className="absolute bottom-[-260px] left-1/3 size-[520px] animate-float-c rounded-full bg-[radial-gradient(closest-side,var(--color-brand-100),transparent)] opacity-80 will-change-transform" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_70%,var(--color-canvas))]" />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-24 [&>*]:min-w-0">
          <div>
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200/70 ring-inset">
              <Stethoscope aria-hidden className="size-3.5 shrink-0" /> {L.heroEyebrow}
            </span>
            <h1 className="mt-5 text-[clamp(1.9rem,10vw,2.6rem)] leading-[1.06] font-semibold tracking-tight text-balance break-words text-ink sm:text-6xl">
              {L.heroTitle} <span className="text-brand-600">{L.heroTitleAccent}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-pretty text-ink-2">{L.heroSubtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/book" variant="warm" size="lg">
                {L.ctaBook} <ArrowRight aria-hidden className="btn-arrow size-4" />
              </ButtonLink>
              <LiquidButton asChild size="xl" className="min-h-13 text-base! font-semibold!">
                <Link href="/explain">
                  <FileText aria-hidden className="size-4" /> {L.ctaExplain}
                </Link>
              </LiquidButton>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
              {L.trust.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 aria-hidden className="size-4 text-brand-600" /> {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm font-medium text-muted italic">Hamshifo UZ — {t.tagline}</p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <HeroWidget />
          </div>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHead title={L.stepsTitle} subtitle={L.stepsSubtitle} />
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {L.steps.map((s, i) => {
            const Icon = STEP_ICONS[i]!;
            return (
              <li
                key={s.title}
                className="reveal relative rounded-2xl border border-line bg-surface p-6 shadow-card"
                style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties}
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="absolute top-6 right-6 text-sm font-semibold text-line-strong tabular-nums">{i + 1}</span>
                <h3 className="mt-5 font-semibold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.text}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ─── Why queues happen ────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 [content-visibility:auto] [contain-intrinsic-size:auto_640px]">
        <SectionHead title={L.whyTitle} subtitle={L.whySubtitle} />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {L.why.map((w, i) => (
            <div key={w.title} className="reveal overflow-hidden rounded-2xl border border-line bg-surface shadow-card" style={{ "--reveal-delay": `${i * 120}ms` } as React.CSSProperties}>
              <div className="p-6">
                <Badge tone="warm" className="h-7 min-w-7 justify-center text-sm! font-semibold tabular-nums">{i + 1}</Badge>
                <h3 className="mt-4 text-lg font-semibold text-ink">{w.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{w.text}</p>
              </div>
              <div className="flex items-start gap-3 border-t border-line bg-brand-50/60 px-6 py-4">
                <HamdardAvatar className="size-8" />
                <p className="text-[15px] font-medium text-brand-900">{w.fix}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Hamdard AI ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 [content-visibility:auto] [contain-intrinsic-size:auto_640px]">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="reveal">
            <Badge tone="brand">{t.common.aiLabel}</Badge>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{L.aiTitle}</h2>
            <p className="mt-3 text-lg text-muted">{L.aiSubtitle}</p>
            <ul className="mt-6 space-y-3">
              {L.aiPoints.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[15px] text-ink-2">
                  <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-600" /> {p}
                </li>
              ))}
            </ul>
            <ButtonLink href="/explain" variant="outline" className="mt-8">
              {L.ctaExplain} <ArrowRight aria-hidden className="btn-arrow size-4" />
            </ButtonLink>
          </div>
          <div className="reveal rounded-[22px] border border-line bg-surface p-5 shadow-pop sm:p-6" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-[14px] leading-relaxed text-white">{L.aiChat.user}</div>
            <div className="mt-4 flex items-start gap-3">
              <HamdardAvatar />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">
                  Hamdard AI · {t.common.aiLabel}
                </p>
                <div className="mt-1 rounded-2xl rounded-tl-md bg-brand-50 px-4 py-3 text-[14px] leading-relaxed text-ink ring-1 ring-brand-100">
                  {L.aiChat.bot}
                </div>
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-canvas px-3.5 py-2.5 text-xs text-muted">{t.appointment.disclaimer}</p>
          </div>
        </div>
      </section>

      {/* ─── For doctors ──────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 [content-visibility:auto] [contain-intrinsic-size:auto_560px]">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="reveal order-2 rounded-[22px] border border-line bg-surface p-4 shadow-card lg:order-1" aria-hidden>
            <div className="flex items-center justify-between border-b border-line px-2 pb-3">
              <span className="text-sm font-semibold">{t.doctor.title}</span>
              <span className="inline-flex rounded-full bg-canvas p-0.5 text-xs font-medium">
                <span className="rounded-full bg-surface px-3 py-1 shadow-sm">{t.doctor.day}</span>
                <span className="px-3 py-1 text-muted">{t.doctor.week}</span>
              </span>
            </div>
            {[
              { time: "09:00", spec: "Terapevt", urg: "soon" as const },
              { time: "09:40", spec: "LOR", urg: "routine" as const },
              { time: "10:20", spec: "Terapevt", urg: "routine" as const },
            ].map((row, i) => (
              <div key={row.time} className="flex items-center gap-4 border-b border-line/70 px-2 py-3 last:border-0">
                <span className="w-12 text-sm font-semibold tabular-nums">{row.time}</span>
                <span className="flex-1 space-y-1.5">
                  <span className="block h-2.5 w-2/5 rounded-full bg-ink/10" />
                  <span className="block h-2 w-4/5 rounded-full bg-ink/[0.06]" />
                </span>
                <Badge tone={i === 0 ? "warm" : "brand"}>{t.specialties[row.spec as "Terapevt"].name}</Badge>
              </div>
            ))}
          </div>
          <div className="reveal order-1 lg:order-2">
            <Badge tone="outline">
              <ClipboardList aria-hidden className="size-3.5" /> {t.nav.dashboard}
            </Badge>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{L.doctorsTitle}</h2>
            <p className="mt-3 text-lg text-muted">{L.doctorsSubtitle}</p>
            <ul className="mt-6 space-y-3">
              {L.doctorsPoints.map((p) => (
                <li key={p} className="flex items-center gap-3 text-[15px] text-ink-2">
                  <CheckCircle2 aria-hidden className="size-5 text-brand-600" /> {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Coming soon: pharmacy + mobile app ──────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 [content-visibility:auto] [contain-intrinsic-size:auto_720px]">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.35fr]">
          <div id="pharmacy" className="reveal scroll-mt-24 rounded-[22px] border border-dashed border-line-strong bg-surface p-7">
            <div className="flex items-center justify-between">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-warm-100 text-warm-700">
                <Pill aria-hidden className="size-6" />
              </span>
              <Badge tone="warm" className="px-3 py-1">
                {t.nav.soon}
              </Badge>
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">{L.pharmacyTitle}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{L.pharmacyText}</p>
          </div>

          <div className="reveal grid items-center gap-8 overflow-hidden rounded-[22px] border border-line bg-gradient-to-br from-brand-50 via-surface to-warm-50 p-7 sm:grid-cols-[auto_1fr]" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
            {/* CSS-only phone mockup (no official store artwork) */}
            <div aria-hidden className="mx-auto w-[168px] rotate-[-4deg] rounded-[34px] border-[6px] border-ink bg-ink p-1 shadow-pop">
              <div className="relative h-[312px] overflow-hidden rounded-[26px] bg-canvas">
                <div className="absolute top-2 left-1/2 h-4 w-16 -translate-x-1/2 rounded-full bg-ink" />
                <div className="px-3 pt-9">
                  <div className="flex items-center gap-1.5">
                    <span className="size-5 rounded-md bg-gradient-to-br from-brand-400 to-brand-700" />
                    <span className="h-2 w-14 rounded-full bg-ink/20" />
                  </div>
                  <div className="mt-4 rounded-xl bg-surface p-2.5 shadow-sm">
                    <span className="block h-2 w-3/4 rounded-full bg-ink/15" />
                    <span className="mt-1.5 block h-2 w-1/2 rounded-full bg-ink/10" />
                    <span className="mt-3 flex gap-1">
                      <span className="h-5 flex-1 rounded-full bg-ink" />
                      <span className="h-5 flex-1 rounded-full border border-ink/20" />
                      <span className="h-5 flex-1 rounded-full border border-ink/20" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-brand-50 p-2.5">
                    <span className="size-5 shrink-0 rounded-full bg-brand-500" />
                    <span className="flex-1 space-y-1">
                      <span className="block h-1.5 w-full rounded-full bg-brand-700/25" />
                      <span className="block h-1.5 w-4/5 rounded-full bg-brand-700/20" />
                      <span className="block h-1.5 w-3/5 rounded-full bg-brand-700/15" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-warm-100 p-2.5">
                    <BellRing className="size-3.5 text-warm-700" />
                    <span className="h-1.5 w-20 rounded-full bg-warm-700/25" />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight">{L.appTitle}</h2>
                <Badge tone="warm">{t.nav.soon}</Badge>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{L.appText}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[L.appIos, L.appAndroid].map((label) => (
                  <button
                    key={label}
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-xl border border-ink/15 bg-surface/80 px-4 text-sm font-medium text-ink-2"
                  >
                    <Smartphone aria-hidden className="size-4" /> {label}
                  </button>
                ))}
              </div>
              <div className="mt-6 border-t border-ink/10 pt-5">
                <NotifyForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Safety ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 [content-visibility:auto] [contain-intrinsic-size:auto_420px]">
        <SectionHead title={L.safetyTitle} />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {L.safety.map((s, i) => {
            const Icon = [Phone, LockKeyhole, ShieldCheck][i]!;
            return (
              <div key={s.title} className="reveal rounded-2xl border border-line bg-surface p-6" style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties}>
                <Icon aria-hidden className={i === 0 ? "size-6 text-danger-600" : "size-6 text-brand-600"} />
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <div className="on-dark reveal relative overflow-hidden rounded-[28px] bg-ink px-6 py-12 text-white sm:px-12">
          <div aria-hidden className="absolute -top-24 -right-24 size-80 rounded-full bg-[radial-gradient(closest-side,rgb(63_174_146/0.45),transparent)]" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{L.ctaTitle}</h2>
              <p className="mt-3 text-lg text-white/75">{L.ctaText}</p>
              <ButtonLink href="/book" variant="warm" size="lg" className="mt-6">
                {L.ctaBook} <ArrowRight aria-hidden className="btn-arrow size-4" />
              </ButtonLink>
            </div>
            {!user && demoEnabled() && (
              <div className="rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
                <DemoButtons />
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
