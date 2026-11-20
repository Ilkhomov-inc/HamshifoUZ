"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock,
  Globe,
  Info,
  MapPin,
  RotateCcw,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { SPECIALTIES, type Specialty } from "@/lib/ai/specialties";
import type { DoctorCard, FreeSlot } from "@/lib/data/catalog";
import type { RouterOutput } from "@/lib/ai/schemas";
import { dateKey, formatDate, formatDateKey, formatTime } from "@/lib/time";
import { MAX_SYMPTOMS, normalizePhone } from "@/lib/validation-client";
import { cn } from "@/lib/cn";
import { Button, buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CITIES } from "@/lib/cities";
import { Card, Skeleton } from "@/components/ui/card";
import { FieldError, Hint, Input, Label, Textarea } from "@/components/ui/field";
import { HamdardAvatar, TypingDots } from "@/components/ai/avatar";
import { EmergencyBanner } from "@/components/ai/emergency-banner";
import { DemoButtons } from "@/components/auth/demo-buttons";
import { initials } from "@/components/layout/user-menu";
import { StepIndicator } from "./step-indicator";
import { Calendar } from "./calendar";
import { SuccessCheck } from "./success-check";
import { downloadIcs } from "./ics";
import { GoogleG } from "@/components/auth/google-g";

type Step = "symptoms" | "specialist" | "slot" | "details" | "done";
type RouteResponse = { emergency: { isEmergency: boolean; categories: string[] }; result: RouterOutput; source: string; lang?: { locale: string; script: string } };
type Clarification = { q: string; a: string };
type BookingUser = { name: string; isDemo: boolean } | null;

const STORAGE_KEY = "hs_booking_v2";
const STEP_INDEX: Record<Step, 0 | 1 | 2 | 3> = { symptoms: 0, specialist: 1, slot: 2, details: 2, done: 3 };

type Persisted = {
  step: Step;
  symptoms: string;
  route: RouteResponse | null;
  clarifications: Clarification[];
  clarifySkipped: boolean;
  emergencyAck: boolean;
  specialty: Specialty | null;
  city: string;
  doctor: DoctorCard | null;
  slot: FreeSlot | null;
  name: string;
  phone: string;
  savedAt: number;
};

/** Scrolls an element into view; instant when the user asked for reduced motion. */
function scrollToElement(el: Element | null) {
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

function loadPersisted(): Persisted | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Persisted;
    if (Date.now() - p.savedAt > 30 * 60_000 || p.step === "done") return null;
    return p;
  } catch {
    return null;
  }
}

export function BookingFlow({
  user,
  initialDoctor,
  initialSpecialty,
  googleEnabled,
  demoEnabled,
}: {
  user: BookingUser;
  initialDoctor: DoctorCard | null;
  initialSpecialty: Specialty | null;
  googleEnabled: boolean;
  demoEnabled: boolean;
}) {
  const { t, locale } = useI18n();
  // First render is deterministic (server = client); saved progress is restored after mount.
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>(initialDoctor ? "slot" : initialSpecialty ? "specialist" : "symptoms");
  const [symptoms, setSymptoms] = useState("");
  const [route, setRoute] = useState<RouteResponse | null>(null);
  // Hamdard may ask one clarifying question; the answer is sent back with the same symptoms.
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [clarifySkipped, setClarifySkipped] = useState(false);
  const [clarifyDraft, setClarifyDraft] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [emergencyAck, setEmergencyAck] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [specialty, setSpecialty] = useState<Specialty | null>(initialDoctor?.specialty ?? initialSpecialty);
  const [city, setCity] = useState("");
  const [doctors, setDoctors] = useState<DoctorCard[] | null>(null);
  const [doctor, setDoctor] = useState<DoctorCard | null>(initialDoctor);
  const [slots, setSlots] = useState<FreeSlot[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<FreeSlot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [consent, setConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<{ id: string; doctor: DoctorCard; slot: FreeSlot } | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  // Bumped when a fresh AI answer arrives, so it can be brought into view after it renders.
  const [resultTick, setResultTick] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerTick, setPickerTick] = useState(0);

  // ── Restore / initialise (client only, avoids hydration mismatch) ────────
  useEffect(() => {
    const saved = loadPersisted();
    if (initialDoctor) {
      if (saved?.doctor?.id === initialDoctor.id) {
        setSymptoms(saved.symptoms);
        setRoute(saved.route);
        setClarifications(saved.clarifications ?? []);
        setClarifySkipped(Boolean(saved.clarifySkipped));
        setSlot(saved.slot);
        setName(saved.name);
        setPhone(saved.phone);
        if (saved.step === "details") setStep("details");
      }
    } else if (initialSpecialty) {
      // explicit deep link wins over saved progress
    } else if (saved) {
      setStep(saved.step);
      setSymptoms(saved.symptoms);
      setRoute(saved.route);
      setClarifications(saved.clarifications ?? []);
      setClarifySkipped(Boolean(saved.clarifySkipped));
      setEmergencyAck(saved.emergencyAck);
      setSpecialty(saved.specialty);
      setCity(saved.city);
      setDoctor(saved.doctor);
      setSlot(saved.slot);
      setName(saved.name);
      setPhone(saved.phone);
    }
    setReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefill identity for signed-in users; demo users get fictional data.
  useEffect(() => {
    if (!user) return;
    setName((n) => n || (user.isDemo ? "Demo Bemor" : user.name.replace(/\s*\(demo\)/i, "")));
    setPhone((p) => (p.replace(/\D/g, "").length > 3 ? p : user.isDemo ? "+998 00 000 00 00" : p));
  }, [user]);

  useEffect(() => {
    if (!ready || step === "done") return;
    const p: Persisted = { step, symptoms, route, clarifications, clarifySkipped, emergencyAck, specialty, city, doctor, slot, name, phone, savedAt: Date.now() };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      /* storage unavailable — flow still works */
    }
  }, [ready, step, symptoms, route, clarifications, clarifySkipped, emergencyAck, specialty, city, doctor, slot, name, phone]);

  const go = useCallback((next: Step) => {
    setStep(next);
    requestAnimationFrame(() => scrollToElement(topRef.current));
  }, []);

  // The answer (and above all the 103 emergency banner) renders below the form, which on a
  // phone is under the fold. Bring it into view as soon as it is on the page.
  useEffect(() => {
    if (resultTick > 0) scrollToElement(resultRef.current);
  }, [resultTick]);
  useEffect(() => {
    if (pickerTick > 0) scrollToElement(pickerRef.current);
  }, [pickerTick]);

  // ── Doctors ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "specialist" || !specialty) return;
    const ctrl = new AbortController();
    setDoctors(null);
    const qs = new URLSearchParams({ specialty, ...(city ? { city } : {}) });
    fetch(`/api/doctors?${qs}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { doctors: [] }))
      .then((d: { doctors: DoctorCard[] }) => setDoctors(d.doctors))
      .catch(() => !ctrl.signal.aborted && setDoctors([]));
    return () => ctrl.abort();
  }, [step, specialty, city]);

  // ── Slots ───────────────────────────────────────────────────────────────
  const loadSlots = useCallback(async (doctorId: string, signal?: AbortSignal) => {
    const res = await fetch(`/api/slots?doctorId=${doctorId}&days=15`, { signal, cache: "no-store" });
    const data = res.ok ? ((await res.json()) as { slots: FreeSlot[] }) : { slots: [] };
    setSlots(data.slots);
    return data.slots;
  }, []);

  useEffect(() => {
    if ((step !== "slot" && step !== "details") || !doctor) return;
    const ctrl = new AbortController();
    setSlots(null);
    loadSlots(doctor.id, ctrl.signal).catch(() => undefined);
    return () => ctrl.abort();
  }, [step === "slot" || step === "details", doctor?.id, loadSlots]); // eslint-disable-line react-hooks/exhaustive-deps

  const byDay = useMemo(() => {
    const map = new Map<string, FreeSlot[]>();
    for (const s of slots ?? []) {
      const k = dateKey(s.startsAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return map;
  }, [slots]);
  const dayCounts = useMemo(() => new Map([...byDay].map(([k, v]) => [k, v.length])), [byDay]);

  useEffect(() => {
    if (!slots) return;
    if (!day || !byDay.has(day)) {
      const preferred = slot ? dateKey(slot.startsAt) : null;
      setDay(preferred && byDay.has(preferred) ? preferred : (byDay.keys().next().value ?? null));
    }
    if (slot && !slots.some((s) => s.id === slot.id)) setSlot(null);
  }, [slots]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ─────────────────────────────────────────────────────────────
  async function analyze(answers: Clarification[] = []) {
    if (analyzing) return;
    const text = symptoms.trim();
    if (text.length < 3) {
      setAiError(t.book.errors.symptoms!);
      return;
    }
    setAnalyzing(true);
    setAiError(null);
    setRoute(null);
    setClarifications(answers);
    setClarifySkipped(false);
    setClarifyDraft("");
    // The 103 warning stays acknowledged across the follow-up round; a new description resets it.
    if (!answers.length) setEmergencyAck(false);
    setShowPicker(false);
    try {
      const res = await fetch("/api/ai/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, locale, ...(answers.length ? { clarifications: answers } : {}) }),
      });
      if (!res.ok) {
        const code = ((await res.json().catch(() => ({}))) as { error?: { code?: string } }).error?.code ?? "server";
        setAiError(t.ai.errors[code] ?? t.ai.errors.server!);
        return;
      }
      const data = (await res.json()) as RouteResponse;
      setRoute(data);
      setSpecialty(data.result.specialty);
      setResultTick((n) => n + 1);
    } catch {
      setAiError(t.ai.errors.server!);
    } finally {
      setAnalyzing(false);
    }
  }

  function answerClarify(answer: string) {
    const q = route?.result.clarifying_question;
    const a = answer.trim().replace(/\s+/g, " ").slice(0, 200);
    if (!q || !a) return;
    analyze([{ q: q.slice(0, 200), a }]);
  }

  function togglePicker() {
    const open = !showPicker;
    setShowPicker(open);
    if (open) setPickerTick((n) => n + 1); // the list opens below the form — bring it into view
  }

  function chooseSpecialty(s: Specialty) {
    setSpecialty(s);
    setShowPicker(false);
    go("specialist");
  }

  function chooseDoctor(d: DoctorCard) {
    setDoctor(d);
    setSlot(null);
    setDay(null);
    setBookingError(null);
    go("slot");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slot || !doctor || submitting) return;
    const errs: Record<string, string> = {};
    const cleanName = name.trim().replace(/\s+/g, " ");
    if (cleanName.length < 2 || cleanName.length > 80) errs.name = t.book.errors.name!;
    if (!normalizePhone(phone)) errs.phone = t.book.errors.phone!;
    if (!consent) errs.consent = t.book.errors.consent!;
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    setBookingError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: slot.id,
          name: cleanName,
          phone,
          symptoms: symptomsForDoctor,
          aiSpecialty: route?.result.specialty ?? null,
          aiUrgency: route?.result.urgency ?? null,
          consent: true,
        }),
      });
      if (res.status === 201) {
        const { id } = (await res.json()) as { id: string };
        setBooked({ id, doctor, slot });
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        go("done");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: { code?: string; fields?: string[] } };
      const code = body.error?.code ?? "server";
      if (code === "slot_taken" || code === "too_late") {
        // Optimistically drop the taken slot, then refresh availability from the server.
        setSlots((list) => list?.filter((s) => s.id !== slot.id) ?? null);
        setSlot(null);
        setBookingError(t.book.errors[code]!);
        go("slot");
        loadSlots(doctor.id).catch(() => undefined);
      } else if (code === "validation" && body.error?.fields) {
        const fe: Record<string, string> = {};
        for (const f of body.error.fields) fe[f] = t.book.errors[f] ?? t.book.errors.validation!;
        setFieldErrors(fe);
      } else {
        setBookingError(t.book.errors[code] ?? t.book.errors.server!);
      }
    } catch {
      setBookingError(t.book.errors.server!);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setRoute(null);
    setClarifications([]);
    setClarifySkipped(false);
    setClarifyDraft("");
    setSymptoms("");
    setAiError(null);
    setEmergencyAck(false);
    setShowPicker(false);
    setSpecialty(null);
    setCity("");
    setDoctor(null);
    setSlot(null);
    setDay(null);
    setBooked(null);
    setConsent(false);
    setFieldErrors({});
    setBookingError(null);
    go("symptoms");
  }

  const specName = (s: Specialty) => t.specialties[s].name;
  const emergency = route?.emergency.isEmergency ?? false;
  // One question at most, and never in front of an emergency answer.
  const asking = Boolean(route?.result.clarifying_question) && !emergency && clarifications.length === 0 && !clarifySkipped;
  const alternative = route && route.result.alternative !== "none" ? route.result.alternative : null;
  // The doctor sees the patient's words plus the answer to Hamdard's question.
  const symptomsForDoctor = [symptoms.trim(), ...clarifications.map((c) => `${c.q} ${c.a}`)].join("\n").slice(0, MAX_SYMPTOMS);

  return (
    <div ref={topRef} className="scroll-mt-24">
      <div className="mx-auto max-w-xl">
        <StepIndicator current={STEP_INDEX[step]} complete={step === "done"} />
      </div>

      <div className="mt-8">
        <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={step}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === "symptoms" && (
                <div className="mx-auto max-w-2xl">
                  <Card className="p-5 sm:p-7">
                    <div className="flex items-center gap-3">
                      <HamdardAvatar pulse={analyzing} />
                      <div>
                        <p className="font-semibold text-ink">{t.ai.name}</p>
                        <p className="text-xs text-muted">{t.common.aiLabel}</p>
                      </div>
                    </div>
                    <form
                      className="mt-6"
                      onSubmit={(e) => {
                        e.preventDefault();
                        analyze();
                      }}
                    >
                      <Label htmlFor="symptoms">{t.book.symptomsLabel}</Label>
                      <Textarea
                        id="symptoms"
                        value={symptoms}
                        maxLength={MAX_SYMPTOMS}
                        onChange={(e) => setSymptoms(e.target.value)}
                        placeholder={t.book.symptomsPlaceholder}
                        aria-describedby="symptoms-hint"
                        rows={4}
                      />
                      <div className="mt-1.5 flex items-start justify-between gap-3">
                        <Hint id="symptoms-hint" className="mt-0">
                          {t.book.symptomsHint}
                        </Hint>
                        <span className="shrink-0 text-xs text-muted tabular-nums">
                          {symptoms.length}/{MAX_SYMPTOMS}
                        </span>
                      </div>
                      <div className="no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
                        {t.book.examples.map((ex) => (
                          <button
                            key={ex}
                            type="button"
                            onClick={() => setSymptoms(ex)}
                            className="chip shrink-0 whitespace-nowrap"
                          >
                            {ex}
                          </button>
                        ))}
                      </div>
                      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Button variant="ghost" className="sm:-ml-3" aria-expanded={showPicker} onClick={togglePicker}>
                          {t.book.skipAi}
                        </Button>
                        <Button
                          type="submit"
                          size="lg"
                          loading={analyzing}
                          icon={<Sparkles aria-hidden className="size-4" />}
                          disabled={symptoms.trim().length < 3}
                        >
                          {analyzing ? t.book.analyzing : t.book.analyze}
                        </Button>
                      </div>
                      <FieldError>{aiError}</FieldError>
                    </form>
                  </Card>

                  <div ref={resultRef} aria-live="polite" className="mt-5 scroll-mt-20 space-y-4">
                    {analyzing && (
                      <div className="flex animate-fade-up items-start gap-3">
                        <HamdardAvatar />
                        <div className="rounded-2xl rounded-tl-md bg-surface px-4 py-3 shadow-card ring-1 ring-line">
                          <TypingDots label={t.ai.typing} />
                        </div>
                      </div>
                    )}
                    {route && !analyzing && (
                      <>
                        {emergency && <EmergencyBanner onContinue={emergencyAck ? undefined : () => setEmergencyAck(true)} />}
                        {asking && (
                          <m.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="flex items-start gap-3"
                          >
                            <HamdardAvatar className="hidden sm:inline-flex" />
                            <Card className="flex-1 p-5 sm:p-6">
                              <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t.book.clarifyTitle}</p>
                              <p id="clarify-q" className="mt-2 text-lg font-semibold tracking-tight text-ink">
                                {route.result.clarifying_question}
                              </p>
                              {route.result.quick_replies.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {route.result.quick_replies.map((r) => (
                                    <button key={r} type="button" className="chip" onClick={() => answerClarify(r)}>
                                      {r}
                                    </button>
                                  ))}
                                </div>
                              )}
                              <form
                                className="mt-4 flex flex-col gap-2 sm:flex-row"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  answerClarify(clarifyDraft);
                                }}
                              >
                                <Input
                                  aria-labelledby="clarify-q"
                                  value={clarifyDraft}
                                  maxLength={200}
                                  onChange={(e) => setClarifyDraft(e.target.value)}
                                  placeholder={t.book.clarifyPlaceholder}
                                  className="sm:flex-1"
                                />
                                <Button type="submit" disabled={!clarifyDraft.trim()}>
                                  {t.book.clarifySend}
                                </Button>
                              </form>
                              <Button variant="ghost" size="sm" className="mt-2 -ml-3" onClick={() => setClarifySkipped(true)}>
                                {t.book.clarifySkip}
                              </Button>
                            </Card>
                          </m.div>
                        )}
                        {!asking && (!emergency || emergencyAck) && (
                          <m.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="flex items-start gap-3"
                          >
                            <HamdardAvatar className="hidden sm:inline-flex" />
                            <Card className="flex-1 overflow-hidden">
                              <div className="p-5 sm:p-6">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge tone="brand">{t.common.aiLabel}</Badge>
                                  <Badge tone="outline">{t.confidence[route.result.confidence]}</Badge>
                                  <Badge tone={route.result.urgency === "routine" ? "neutral" : route.result.urgency === "soon" ? "warm" : "danger"}>
                                    {t.urgency[route.result.urgency]}
                                  </Badge>
                                </div>
                                {route.result.understood.length > 0 && (
                                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                                    <span className="mr-1 text-xs text-muted">{t.book.understood}:</span>
                                    {route.result.understood.map((u) => (
                                      <Badge key={u} tone="neutral">
                                        {u}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                <p className="mt-4 text-sm text-muted">{t.book.resultTitle}</p>
                                <p className="text-2xl font-semibold tracking-tight text-ink">{specName(route.result.specialty)}</p>
                                <p className="text-sm text-ink-2">{t.specialties[route.result.specialty].desc}</p>
                                <p className="mt-4 text-[15px] leading-relaxed text-ink">{route.result.reason_short}</p>
                                {route.result.follow_up_questions.length > 0 && (
                                  <div className="mt-4 rounded-xl bg-canvas p-4">
                                    <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t.book.doctorMayAsk}</p>
                                    <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
                                      {route.result.follow_up_questions.map((q) => (
                                        <li key={q} className="flex gap-2">
                                          <span aria-hidden className="text-brand-600">•</span> {q}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {alternative && (
                                  <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-2">
                                    {t.book.alsoFits}:
                                    <button type="button" className="chip" onClick={() => chooseSpecialty(alternative)}>
                                      {specName(alternative)}
                                      <ArrowRight aria-hidden className="ml-1 size-3.5" />
                                    </button>
                                  </p>
                                )}
                                <p className="mt-4 flex items-start gap-2 text-xs text-muted">
                                  <Info aria-hidden className="mt-px size-3.5 shrink-0" /> {t.common.notDiagnosis}
                                  {route.source === "fallback" && <> · {t.book.sourceFallback}</>}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2 border-t border-line bg-canvas/60 p-4 sm:flex-row sm:justify-end">
                                <Button variant="outline" onClick={togglePicker}>
                                  {t.book.chooseOther}
                                </Button>
                                <Button variant={emergency ? "outline" : "warm"} onClick={() => chooseSpecialty(route.result.specialty)}>
                                  {fmt(t.book.findDoctors, { specialty: specName(route.result.specialty) })}
                                  <ArrowRight aria-hidden className="btn-arrow size-4" />
                                </Button>
                              </div>
                            </Card>
                          </m.div>
                        )}
                      </>
                    )}
                    {showPicker && (
                      <div ref={pickerRef} className="scroll-mt-20">
                      <Card className="animate-fade-up p-5">
                        <p className="font-semibold text-ink">{t.book.pickSpecialty}</p>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2 [&>*]:min-w-0">
                          {SPECIALTIES.map((s) => (
                            <button
                              key={s}
                              type="button"
                              aria-pressed={s === specialty}
                              onClick={() => chooseSpecialty(s)}
                              className={cn(
                                "rounded-xl border p-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-card active:scale-[0.99]",
                                s === specialty ? "border-brand-400 bg-brand-50" : "border-line",
                              )}
                            >
                              <span className="block text-sm font-semibold text-ink">{specName(s)}</span>
                              <span className="block text-xs text-muted">{t.specialties[s].desc}</span>
                            </button>
                          ))}
                        </div>
                      </Card>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === "specialist" && specialty && (
                <div className="mx-auto max-w-3xl">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <Button variant="ghost" size="sm" className="mb-2 -ml-3" icon={<ArrowLeft aria-hidden className="btn-arrow-back size-4" />} onClick={() => go("symptoms")}>
                        {t.common.back}
                      </Button>
                      <h2 className="text-2xl font-semibold tracking-tight">{fmt(t.book.doctorsTitle, { specialty: specName(specialty) })}</h2>
                      <p className="text-sm text-muted">{t.specialties[specialty].desc}</p>
                    </div>
                    <label className="text-sm">
                      <span className="sr-only">{t.book.pickSpecialty}</span>
                      <select
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value as Specialty)}
                        className="h-10 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium"
                      >
                        {SPECIALTIES.map((s) => (
                          <option key={s} value={s}>
                            {specName(s)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="mt-5 flex items-center gap-2 text-sm">
                    <MapPin aria-hidden className="size-4 text-muted" />
                    <span className="sr-only">{t.book.filterCity}</span>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-10 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium"
                    >
                      {["", ...CITIES].map((c) => (
                        <option key={c || "all"} value={c}>
                          {t.cities[c || "all"]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="mt-5 grid gap-3 [&>*]:min-w-0">
                    {doctors === null &&
                      [0, 1, 2].map((i) => (
                        <Card key={i} className="flex items-center gap-4 p-5">
                          <Skeleton className="size-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                          <Skeleton className="h-10 w-24 rounded-full" />
                        </Card>
                      ))}
                    {doctors?.length === 0 && <Card className="p-6 text-center text-sm text-muted">{t.book.noDoctors}</Card>}
                    {doctors?.map((d, i) => (
                      <m.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}>
                        <Card className="flex flex-col gap-4 p-5 transition-[border-color,box-shadow] hover:border-line-strong sm:flex-row sm:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-4">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-sm font-semibold text-brand-800">
                              {initials(d.fullName)}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold wrap-anywhere text-ink">{d.fullName}</p>
                              <p className="truncate text-sm text-muted" title={d.clinic.name}>
                                {specName(d.specialty)} · {d.clinic.name}
                              </p>
                              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin aria-hidden className="size-3.5" /> {t.cities[d.clinic.city]}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock aria-hidden className="size-3.5" /> {d.slotMinutes} {t.common.minutes}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
                            <div className="text-left sm:text-right">
                              <p className="text-xs text-muted">{t.book.nextAvailable}</p>
                              <p className="text-sm font-semibold text-ink">
                                {d.nextSlot ? `${formatDate(d.nextSlot, locale, { weekday: "short", month: "short" })}, ${formatTime(d.nextSlot)}` : t.book.noSlots}
                              </p>
                            </div>
                            <Button size="sm" disabled={!d.nextSlot} onClick={() => chooseDoctor(d)}>
                              {t.book.choose}
                            </Button>
                          </div>
                        </Card>
                      </m.div>
                    ))}
                  </div>
                </div>
              )}

              {(step === "slot" || step === "details") && doctor && (
                <Card className="overflow-hidden">
                  <div className={cn("grid [&>*]:min-w-0", step === "slot" ? "lg:grid-cols-[280px_1fr_260px]" : "lg:grid-cols-[280px_1fr]")}>
                    {/* Left: doctor & clinic */}
                    <aside className="border-b border-line p-5 sm:p-6 lg:border-r lg:border-b-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mb-4 -ml-3"
                        icon={<ArrowLeft aria-hidden className="btn-arrow-back size-4" />}
                        onClick={() => (step === "details" ? go("slot") : specialty ? go("specialist") : go("symptoms"))}
                      >
                        {step === "details" ? t.common.back : t.book.changeDoctor}
                      </Button>
                      <span className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-sm font-semibold text-brand-800">
                        {initials(doctor.fullName)}
                      </span>
                      <p className="mt-3 text-sm text-muted">{specName(doctor.specialty)}</p>
                      <h2 className="text-xl font-semibold tracking-tight wrap-anywhere text-ink">{doctor.fullName}</h2>
                      <ul className="mt-4 space-y-2.5 text-sm text-ink-2">
                        <li className="flex gap-2.5">
                          <Stethoscope aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
                          <span className="min-w-0 wrap-anywhere">
                            {doctor.clinic.name}
                            <span className="block text-muted">
                              {doctor.clinic.address} · {t.common.room} {doctor.room}
                            </span>
                          </span>
                        </li>
                        <li className="flex gap-2.5">
                          <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
                          {doctor.slotMinutes} {t.common.minutes}
                        </li>
                        <li className="flex gap-2.5">
                          <Globe aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
                          {doctor.languages.map((l) => t.common.langNames[l] ?? l).join(", ")}
                        </li>
                        {slot && step === "details" && (
                          <li className="flex gap-2.5 font-medium text-ink">
                            <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-600" />
                            <span>
                              {formatDate(slot.startsAt, locale)}
                              <span className="block">
                                {formatTime(slot.startsAt)} – {formatTime(slot.endsAt)}
                              </span>
                            </span>
                          </li>
                        )}
                      </ul>
                      <p className="mt-5 text-xs text-muted">{t.book.timezone}</p>
                    </aside>

                    {step === "slot" ? (
                      <>
                        {/* Center: calendar */}
                        <div className="border-b border-line p-5 sm:p-6 lg:border-r lg:border-b-0">
                          {bookingError && (
                            <p role="alert" className="mb-4 animate-fade-up rounded-xl bg-warm-100 px-4 py-3 text-sm font-medium text-warm-700 ring-1 ring-warm-200">
                              {bookingError}
                            </p>
                          )}
                          {slots === null ? (
                            <div className="grid grid-cols-7 gap-1.5">
                              {Array.from({ length: 35 }, (_, i) => (
                                <Skeleton key={i} className="aspect-square rounded-xl" />
                              ))}
                            </div>
                          ) : (
                            <Calendar
                              available={dayCounts}
                              selected={day}
                              onSelect={(k) => {
                                setDay(k);
                                setSlot(null);
                              }}
                            />
                          )}
                        </div>
                        {/* Right: time slots */}
                        <div className="p-5 sm:p-6">
                          <p className="text-[15px] font-semibold text-ink">
                            {day ? formatDateKey(day, locale, { weekday: "short", month: "short" }) : t.book.pickDay}
                          </p>
                          <div className="no-scrollbar mt-4 grid max-h-[420px] grid-cols-3 gap-2 overflow-y-auto pr-0.5 lg:grid-cols-1">
                            {slots === null &&
                              Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-11 rounded-full" />)}
                            {slots && day && (byDay.get(day) ?? []).length === 0 && <p className="col-span-full text-sm text-muted">{t.book.noTimes}</p>}
                            {slots &&
                              day &&
                              (byDay.get(day) ?? []).map((s) => {
                                const selected = slot?.id === s.id;
                                return (
                                  <div key={s.id} className={cn("grid gap-2", selected && "col-span-full grid-cols-2")}>
                                    <button
                                      type="button"
                                      aria-pressed={selected}
                                      onClick={() => setSlot(s)}
                                      className={cn(
                                        "relative h-11 rounded-full border text-sm font-semibold tabular-nums transition-[background-color,border-color,color,box-shadow,transform] duration-200 active:scale-[0.97]",
                                        selected ? "border-ink bg-ink/[0.08] text-ink" : "border-line-strong bg-surface text-ink hover:-translate-y-px hover:border-ink/50 hover:shadow-sm",
                                      )}
                                    >
                                      {selected && <m.span layoutId="slot-dot" className="absolute top-1/2 left-3 size-1.5 -translate-y-1/2 rounded-full bg-brand-600" />}
                                      {formatTime(s.startsAt)}
                                    </button>
                                    {selected && (
                                      <m.button
                                        type="button"
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.22 }}
                                        onClick={() => {
                                          setBookingError(null);
                                          go("details");
                                        }}
                                        className={buttonClass("primary", "md", "h-11")}
                                      >
                                        {t.common.next} <ArrowRight aria-hidden className="btn-arrow size-4" />
                                      </m.button>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-5 sm:p-7">
                        <h3 className="text-xl font-semibold tracking-tight">{t.book.detailsTitle}</h3>
                        {!user ? (
                          <div className="mt-5 rounded-2xl border border-line bg-canvas p-5">
                            <p className="font-semibold text-ink">{t.book.signInTitle}</p>
                            <p className="mt-1 text-sm text-muted">{t.book.signInText}</p>
                            <div className="mt-4 space-y-3">
                              {googleEnabled && (
                                <a href={`/api/auth/google?returnTo=${encodeURIComponent("/book")}`} className={buttonClass("outline", "lg", "w-full")}>
                                  <GoogleG /> {t.signin.google}
                                </a>
                              )}
                              {demoEnabled && <DemoButtons roles={["patient"]} stay compact />}
                            </div>
                          </div>
                        ) : (
                          <form onSubmit={submit} className="mt-5 space-y-5" noValidate>
                            <div>
                              <Label htmlFor="b-name">{t.book.nameLabel}</Label>
                              <Input
                                id="b-name"
                                autoComplete="name"
                                maxLength={80}
                                value={name}
                                placeholder={t.book.namePlaceholder}
                                onChange={(e) => setName(e.target.value)}
                                aria-invalid={Boolean(fieldErrors.name)}
                                aria-describedby={fieldErrors.name ? "b-name-err" : undefined}
                              />
                              <FieldError id="b-name-err">{fieldErrors.name}</FieldError>
                            </div>
                            <div>
                              <Label htmlFor="b-phone">{t.book.phoneLabel}</Label>
                              <Input
                                id="b-phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                maxLength={20}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                aria-invalid={Boolean(fieldErrors.phone)}
                                aria-describedby="b-phone-hint"
                              />
                              <Hint id="b-phone-hint">{t.book.phoneHint}</Hint>
                              <FieldError>{fieldErrors.phone}</FieldError>
                            </div>
                            <div>
                              <Label htmlFor="b-symptoms">{t.book.symptomsForDoctor}</Label>
                              <Textarea id="b-symptoms" rows={3} maxLength={MAX_SYMPTOMS} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
                            </div>
                            <div className="rounded-xl bg-canvas p-4 ring-1 ring-line">
                              <p className="text-sm font-semibold text-ink">{t.book.privacyTitle}</p>
                              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                                {t.book.privacyText}{" "}
                                <Link href="/privacy" className="font-medium text-brand-700 underline-offset-2 hover:underline" target="_blank">
                                  {t.book.privacyLink}
                                </Link>
                              </p>
                              <label className="mt-3 flex items-start gap-2.5 text-sm text-ink">
                                <input
                                  type="checkbox"
                                  checked={consent}
                                  onChange={(e) => setConsent(e.target.checked)}
                                  className="mt-0.5 size-4 shrink-0 accent-brand-600"
                                  aria-invalid={Boolean(fieldErrors.consent)}
                                />
                                {t.book.consent}
                              </label>
                              <FieldError>{fieldErrors.consent}</FieldError>
                            </div>
                            {bookingError && (
                              <p role="alert" className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700 ring-1 ring-danger-200">
                                {bookingError}
                              </p>
                            )}
                            <Button type="submit" variant="warm" size="lg" className="w-full" loading={submitting}>
                              {submitting ? t.book.confirming : t.book.confirm}
                            </Button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {step === "done" && booked && (
                <Card className="mx-auto max-w-lg p-7 text-center sm:p-9">
                  <SuccessCheck />
                  <h2 className="mt-6 text-2xl font-semibold tracking-tight">{t.book.successTitle}</h2>
                  <p className="mt-2 text-muted">{t.book.successText}</p>
                  <dl className="mt-6 space-y-3 rounded-2xl bg-canvas p-5 text-left text-sm ring-1 ring-line">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">{t.appointment.when}</dt>
                      <dd className="text-right font-semibold">
                        {formatDate(booked.slot.startsAt, locale)}, {formatTime(booked.slot.startsAt)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="shrink-0 text-muted">{specName(booked.doctor.specialty)}</dt>
                      <dd className="min-w-0 text-right font-semibold wrap-anywhere">{booked.doctor.fullName}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">{t.common.clinic}</dt>
                      <dd className="min-w-0 text-right wrap-anywhere">
                        {booked.doctor.clinic.name}
                        <span className="block text-muted">
                          {t.common.room} {booked.doctor.room}
                        </span>
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-6 grid gap-2 [&>*]:min-w-0">
                    <Link href="/appointments" className={buttonClass("primary", "lg")}>
                      {t.book.viewAppointments}
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() =>
                        downloadIcs({
                          id: booked.id,
                          start: booked.slot.startsAt,
                          end: booked.slot.endsAt,
                          title: `${specName(booked.doctor.specialty)} — ${booked.doctor.fullName}`,
                          location: `${booked.doctor.clinic.name}, ${booked.doctor.clinic.address}`,
                          description: `${t.common.room} ${booked.doctor.room}. Hamshifo UZ (demo)`,
                        })
                      }
                    >
                      <CalendarDays aria-hidden className="size-4" /> {t.book.addToCalendar}
                    </Button>
                    <Button variant="ghost" onClick={reset}>
                      <RotateCcw aria-hidden className="size-4" /> {t.book.bookAnother}
                    </Button>
                  </div>
                </Card>
              )}
            </m.div>
        </AnimatePresence>
      </div>

      {ready && step !== "symptoms" && step !== "done" && (
        <div className="mt-6 text-center">
          <Button variant="ghost" size="sm" icon={<RotateCcw aria-hidden className="size-4" />} onClick={reset}>
            {t.book.startOver}
          </Button>
        </div>
      )}
    </div>
  );
}
