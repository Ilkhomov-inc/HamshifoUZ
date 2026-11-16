"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import { CalendarCheck, CalendarPlus, ClipboardList, ImagePlus, Moon, Phone, RotateCcw, Send, Sparkles, Sun, Sunrise, Sunset, TriangleAlert, Utensils, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import type { DaySlot, ScheduleItem } from "@/lib/ai/schedule";
import { MAX_PRESCRIPTION, MAX_QUESTION } from "@/lib/validation-client";
import { cn } from "@/lib/cn";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, Spinner } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Hint, Label, Textarea } from "@/components/ui/field";
import { HamdardAvatar, TypingDots } from "./avatar";
import { RichText } from "./rich-text";
import { EmergencyBanner } from "./emergency-banner";

type Msg = { role: "user" | "ai"; text: string; needsDoctor?: boolean; emergency?: boolean; error?: string; done?: boolean };
type Image = { mediaType: "image/jpeg"; data: string; preview: string };
type Plan = { items: ScheduleItem[]; followUpDays: number | null };

const SLOT_ICON: Record<DaySlot, typeof Sun> = { morning: Sunrise, noon: Sun, evening: Sunset, night: Moon };

export type DoctorContact = { name: string; specialty: string; phone: string; room: string; clinic: string; address: string };

const SAMPLE = `Amoksitsillin 500 mg — 1 kapsuladan kuniga 3 mahal, har 8 soatda, 7 kun.
Ovqatdan keyin iching.
Ko'p suyuqlik iching.
5 kundan keyin nazorat ko'rigiga keling.`;

/** Downscales a photo in the browser (max 1600px JPEG). Nothing is uploaded until the user asks. */
async function prepareImage(file: File): Promise<Image> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.85));
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { mediaType: "image/jpeg", data: btoa(bin), preview: URL.createObjectURL(blob) };
}

export function ExplainerChat({
  appointmentId,
  contact,
  followUpHref,
}: {
  /** Post-visit mode: the server loads the doctor's note for this appointment. */
  appointmentId?: string;
  contact?: DoctorContact;
  followUpHref?: string;
}) {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<"text" | "photo">("text");
  const [source, setSource] = useState("");
  const [image, setImage] = useState<Image | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [question, setQuestion] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.preview);
  }, [image]);

  const lastAi = [...messages].reverse().find((x) => x.role === "ai" && x.done);
  const needsDoctor = messages.some((x) => x.needsDoctor);

  async function ask(q?: string) {
    if (streaming) return;
    const body: Record<string, unknown> = { locale };
    if (appointmentId) body.appointmentId = appointmentId;
    else if (mode === "photo" && image) body.image = { mediaType: image.mediaType, data: image.data };
    else body.text = source.trim();
    if (q) {
      body.question = q;
      // Earlier exchanges give a short follow-up ("and the second one?") its context.
      const history: Array<{ q: string; a: string }> = [];
      for (let i = 0; i < messages.length - 1; i++) {
        const [ask, reply] = [messages[i]!, messages[i + 1]!];
        if (ask.role === "user" && reply.role === "ai" && reply.done && !reply.error && reply.text) history.push({ q: ask.text, a: reply.text.slice(0, 1200) });
      }
      if (history.length) body.history = history.slice(-3);
    } else {
      setPlan(null);
    }

    setStarted(true);
    setStreaming(true);
    setMessages((list) => [...list, ...(q ? [{ role: "user" as const, text: q }] : []), { role: "ai", text: "" }]);
    const update = (fn: (msg: Msg) => Msg) =>
      setMessages((list) => {
        const copy = [...list];
        copy[copy.length - 1] = fn(copy[copy.length - 1]!);
        return copy;
      });

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const code = ((await res.json().catch(() => ({}))) as { error?: { code?: string } }).error?.code ?? "server";
        update((msg) => ({ ...msg, error: t.ai.errors[code] ?? t.ai.errors.server, done: true }));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as
            | { t: "d"; v: string }
            | { t: "meta"; needsDoctor: boolean; emergency: boolean }
            | { t: "plan"; items: ScheduleItem[]; followUpDays: number | null }
            | { t: "error"; code: string }
            | { t: "end" };
          if (ev.t === "d") update((msg) => ({ ...msg, text: msg.text + ev.v }));
          else if (ev.t === "plan") setPlan({ items: ev.items, followUpDays: ev.followUpDays });
          else if (ev.t === "meta") update((msg) => ({ ...msg, needsDoctor: ev.needsDoctor, emergency: ev.emergency }));
          else if (ev.t === "error") update((msg) => ({ ...msg, error: t.ai.errors[ev.code] ?? t.ai.errors.server }));
        }
      }
      update((msg) => ({ ...msg, done: true }));
    } catch {
      if (!ctrl.signal.aborted) update((msg) => ({ ...msg, error: t.ai.errors.server, done: true }));
    } finally {
      setStreaming(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setImageError(false);
    setImageBusy(true);
    try {
      if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) || file.size > 15_000_000) throw new Error("type");
      setImage(await prepareImage(file));
    } catch {
      setImageError(true);
      setImage(null);
    } finally {
      setImageBusy(false);
    }
  }

  function resetFree() {
    abortRef.current?.abort();
    setMessages([]);
    setStarted(false);
    setQuestion("");
    setPlan(null);
  }

  const canStart = appointmentId ? true : mode === "text" ? source.trim().length >= 3 : Boolean(image);

  return (
    <div className="space-y-4">
      {!started && !appointmentId && (
        <Card className="p-5 sm:p-6">
          <Segmented
            kind="tabs"
            idBase="rx-mode"
            label={t.explain.title}
            value={mode}
            onChange={setMode}
            options={[
              { value: "text", label: t.explain.tabText },
              { value: "photo", label: t.explain.tabPhoto },
            ]}
          />
          {mode === "text" ? (
            <div className="mt-5" role="tabpanel" id="rx-mode-panel" aria-labelledby="rx-mode-text">
              <div className="flex items-center justify-between">
                <Label htmlFor="rx-text">{t.explain.textLabel}</Label>
                <button type="button" onClick={() => setSource(SAMPLE)} className="-mr-2 mb-1 rounded-full px-2.5 py-1.5 text-[13px] font-medium text-brand-700 transition-colors hover:bg-brand-50 active:bg-brand-100">
                  {t.explain.useSample}
                </button>
              </div>
              <Textarea
                id="rx-text"
                rows={6}
                maxLength={MAX_PRESCRIPTION}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder={t.explain.textPlaceholder}
              />
              <p className="mt-1 text-right text-xs text-muted tabular-nums">
                {source.length}/{MAX_PRESCRIPTION}
              </p>
            </div>
          ) : (
            <div className="mt-5" role="tabpanel" id="rx-mode-panel" aria-labelledby="rx-mode-photo">
              <p className="mb-1.5 text-sm font-medium text-ink">{t.explain.photoLabel}</p>
              {image ? (
                <div className="relative overflow-hidden rounded-xl border border-line bg-canvas">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.preview} alt="" className="mx-auto max-h-72 object-contain" />
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    className={buttonClass("outline", "sm", "absolute top-2 right-2")}
                  >
                    <X aria-hidden className="size-3.5" /> {t.explain.photoRemove}
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-canvas px-4 py-10 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/60 has-[:focus-visible]:border-brand-600 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600">
                  {imageBusy ? <Spinner className="size-6 text-brand-600" /> : <ImagePlus aria-hidden className="size-7 text-brand-600" />}
                  <span className="text-sm font-medium text-ink">{imageBusy ? t.explain.photoProcessing : t.explain.photoChoose}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
                </label>
              )}
              <Hint>{t.explain.photoHint}</Hint>
              {imageError && (
                <p role="alert" className="mt-1.5 text-sm text-danger-600">
                  {t.explain.photoError}
                </p>
              )}
            </div>
          )}
          <Button size="lg" className="mt-5 w-full sm:w-auto" icon={<Sparkles aria-hidden className="size-4" />} loading={streaming} disabled={!canStart} onClick={() => ask()}>
            {t.explain.explain}
          </Button>
        </Card>
      )}

      {appointmentId && !started && (
        <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <HamdardAvatar />
          <div className="flex-1">
            <p className="font-semibold text-ink">{t.appointment.explainTitle}</p>
            <p className="text-sm text-muted">{t.appointment.explainIntro}</p>
          </div>
          <Button variant="warm" className="w-full sm:w-auto" icon={<Sparkles aria-hidden className="size-4" />} loading={streaming} onClick={() => ask()}>
            {t.appointment.explainCta}
          </Button>
        </Card>
      )}

      {started && plan && (
        <Card className="animate-fade-up overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-line bg-canvas/60 px-5 py-3.5 sm:px-6">
            <ClipboardList aria-hidden className="size-4 text-brand-600" />
            <h3 className="text-[15px] font-semibold text-ink">{t.appointment.planTitle}</h3>
          </div>
          <ul className="divide-y divide-line">
            {plan.items.map((it, i) => (
              <li key={i} className="px-5 py-4 sm:px-6">
                <p className="text-[14px] leading-relaxed break-words text-ink">{it.line}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {it.slots.length > 0
                    ? it.slots.map((slot) => {
                        const Icon = SLOT_ICON[slot];
                        return (
                          <span key={slot} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-200/70 ring-inset">
                            <Icon aria-hidden className="size-3.5" /> {t.appointment.planSlots[slot]}
                          </span>
                        );
                      })
                    : it.timesPerDay !== null && (
                        <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-200/70 ring-inset">
                          {fmt(t.appointment.planTimes, { n: it.timesPerDay })}
                        </span>
                      )}
                  {it.everyHours !== null && (
                    <span className="inline-flex items-center rounded-full bg-ink/[0.05] px-2.5 py-1 text-xs font-medium text-ink-2">{fmt(t.appointment.planEvery, { n: it.everyHours })}</span>
                  )}
                  {it.meal && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-100 px-2.5 py-1 text-xs font-medium text-warm-700 ring-1 ring-warm-200 ring-inset">
                      <Utensils aria-hidden className="size-3.5" /> {t.appointment.planMeal[it.meal]}
                    </span>
                  )}
                  {it.days !== null && (
                    <span className="inline-flex items-center rounded-full bg-ink/[0.05] px-2.5 py-1 text-xs font-medium text-ink-2">{fmt(t.appointment.planDays, { n: it.days })}</span>
                  )}
                </div>
              </li>
            ))}
            {plan.followUpDays !== null && (
              <li className="flex items-center gap-2.5 px-5 py-3.5 text-[14px] font-medium text-ink sm:px-6">
                <CalendarCheck aria-hidden className="size-4 shrink-0 text-brand-600" /> {fmt(t.appointment.planFollowUp, { n: plan.followUpDays })}
              </li>
            )}
          </ul>
          <p className="border-t border-line bg-canvas/60 px-5 py-2.5 text-xs leading-relaxed text-muted sm:px-6">{t.appointment.planNote}</p>
        </Card>
      )}

      {started && (
        <Card className="p-5 sm:p-6">
          <div className="space-y-5" aria-live="polite">
            {!appointmentId && (
              <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap text-white">
                {mode === "photo" && image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image.preview} alt="" className="max-h-40 rounded-lg" />
                ) : (
                  source.trim()
                )}
              </div>
            )}
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap text-white">
                  {msg.text}
                </div>
              ) : (
                <m.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
                  <HamdardAvatar pulse={streaming && i === messages.length - 1 && !msg.text} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted">
                      {t.ai.name} · {t.common.aiLabel}
                    </p>
                    <div className="mt-1 rounded-2xl rounded-tl-md bg-brand-50/70 px-4 py-3 ring-1 ring-brand-100">
                      {msg.error ? (
                        <p className="text-[15px] text-danger-700">{msg.error}</p>
                      ) : msg.text ? (
                        <RichText text={msg.text} />
                      ) : (
                        <TypingDots label={t.ai.typing} />
                      )}
                    </div>
                    {msg.emergency && (
                      <div className="mt-3">
                        <EmergencyBanner compact />
                      </div>
                    )}
                    {msg.needsDoctor && !msg.emergency && (
                      <p className="mt-3 flex items-start gap-2 rounded-xl bg-warm-100 px-3.5 py-2.5 text-sm font-medium text-warm-700 ring-1 ring-warm-200">
                        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                        <span>
                          {t.appointment.needsDoctorTitle}. {t.appointment.needsDoctorText}
                        </span>
                      </p>
                    )}
                  </div>
                </m.div>
              ),
            )}
            <div ref={endRef} />
          </div>

          {lastAi && !lastAi.error && (
            <form
              className="mt-6 border-t border-line pt-5"
              onSubmit={(e) => {
                e.preventDefault();
                const q = question.trim();
                if (q.length < 2) return;
                setQuestion("");
                ask(q);
              }}
            >
              {(() => {
                const asked = new Set(messages.filter((x) => x.role === "user").map((x) => x.text));
                const left = t.appointment.suggestions.filter((sug) => !asked.has(sug));
                return left.length > 0 ? (
                  <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1" aria-label={t.appointment.suggestLabel} role="group">
                    {left.map((sug) => (
                      <button key={sug} type="button" disabled={streaming} onClick={() => ask(sug)} className="chip shrink-0 whitespace-nowrap disabled:opacity-50">
                        {sug}
                      </button>
                    ))}
                  </div>
                ) : null;
              })()}
              <Label htmlFor="rx-q">{t.appointment.askLabel}</Label>
              <div className="flex gap-2">
                <input
                  id="rx-q"
                  value={question}
                  maxLength={MAX_QUESTION}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={t.appointment.askPlaceholder}
                  className="h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 text-[15px] focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12 focus:outline-none"
                />
                <Button type="submit" aria-label={t.appointment.ask} loading={streaming} icon={<Send aria-hidden className="size-4" />} disabled={question.trim().length < 2} className="shrink-0 px-4">
                  <span className="hidden sm:inline">{t.appointment.ask}</span>
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {/* Always-available next steps; highlighted when the AI says this needs a doctor. */}
      {started && (
        <div className={cn("rounded-2xl border p-4 transition-colors sm:p-5", needsDoctor ? "border-warm-300 bg-warm-50" : "border-line bg-surface")}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={followUpHref ?? "/book"} className={buttonClass(needsDoctor ? "warm" : "outline", "md", "flex-1")}>
              <CalendarPlus aria-hidden className="size-4" /> {t.appointment.followUp}
            </Link>
            {contact ? (
              <Button variant="outline" className="flex-1" aria-expanded={showContact} onClick={() => setShowContact((v) => !v)}>
                <Phone aria-hidden className="size-4" /> {t.appointment.doctorContact}
              </Button>
            ) : (
              <Link href="/appointments" className={buttonClass("outline", "md", "flex-1")}>
                <Phone aria-hidden className="size-4" /> {t.appointment.doctorContact}
              </Link>
            )}
          </div>
          {contact && showContact && (
            <dl className="mt-4 grid animate-fade-up gap-2 rounded-xl bg-surface p-4 text-sm ring-1 ring-line sm:grid-cols-2">
              <div>
                <dt className="text-muted">{contact.specialty}</dt>
                <dd className="font-semibold">{contact.name}</dd>
              </div>
              <div>
                <dt className="text-muted">{t.common.phone}</dt>
                <dd>
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="font-semibold text-brand-700 hover:underline">
                    {contact.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t.common.clinic}</dt>
                <dd>{contact.clinic}</dd>
              </div>
              <div>
                <dt className="text-muted">{t.common.room}</dt>
                <dd>
                  {contact.room} · {contact.address}
                </dd>
              </div>
            </dl>
          )}
          {!appointmentId && !contact && <p className="mt-3 text-xs text-muted">{t.explain.linkHint}</p>}
        </div>
      )}

      <p className="flex items-start gap-2 rounded-xl bg-canvas px-4 py-3 text-[13px] text-muted ring-1 ring-line">
        <Sparkles aria-hidden className="mt-0.5 size-3.5 shrink-0 text-brand-600" /> {t.appointment.disclaimer}
      </p>

      {started && !appointmentId && !streaming && (
        <Button variant="ghost" size="sm" className="-ml-3" icon={<RotateCcw aria-hidden className="size-4" />} onClick={resetFree}>
          {t.explain.newRequest}
        </Button>
      )}
    </div>
  );
}
