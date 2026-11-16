"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { HamdardAvatar, TypingDots } from "@/components/ai/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { Specialty } from "@/lib/ai/specialties";

type Phase = "typing" | "thinking" | "result" | "slots";

const TIMES = [
  ["09:20", "10:40", "14:00"],
  ["11:00", "14:30", "15:30"],
  ["09:40", "12:20", "16:00"],
];

/**
 * Live demo in the hero: example symptoms are typed, Hamdard AI "thinks",
 * then a specialty and the nearest slots appear. Loops; pauses on hover or
 * focus; static when the user prefers reduced motion. Space is reserved for
 * every phase, so nothing shifts layout.
 */
export function HeroWidget() {
  const { t } = useI18n();
  const examples = t.landing.widget.examples;
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const ex = examples[index % examples.length]!;
    if (reduced) {
      setTyped(ex.text);
      setPhase("slots");
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const tick = () => {
          if (cancelled) return;
          if (pausedRef.current) timers.push(window.setTimeout(tick, 120));
          else resolve();
        };
        timers.push(window.setTimeout(tick, ms));
      });

    (async () => {
      setPhase("typing");
      setTyped("");
      for (let i = 1; i <= ex.text.length; i++) {
        await wait(i === 1 ? 500 : 34 + Math.random() * 40);
        if (cancelled) return;
        setTyped(ex.text.slice(0, i));
      }
      await wait(350);
      setPhase("thinking");
      await wait(900);
      setPhase("result");
      await wait(450);
      setPhase("slots");
      await wait(3200);
      if (!cancelled) setIndex((n) => n + 1);
    })();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [index, reduced, examples]);

  const ex = examples[index % examples.length]!;
  const spec = t.specialties[ex.specialty as Specialty];
  const times = TIMES[index % TIMES.length]!;
  const showResult = phase === "result" || phase === "slots";

  return (
    <div
      className="relative w-full max-w-md"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="rounded-[22px] border border-line bg-surface/95 p-5 shadow-pop sm:p-6">
        <div className="flex items-center gap-3">
          <HamdardAvatar pulse={phase === "thinking"} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{t.landing.widget.title}</p>
            <p className="text-xs text-muted">{t.common.aiLabel}</p>
          </div>
          {paused && !reduced && (
            <Badge tone="outline" className="ml-auto">
              {t.landing.widget.paused}
            </Badge>
          )}
        </div>

        <p className="mt-5 text-[13px] font-medium text-ink-2">{t.landing.widget.subtitle}</p>
        <Link
          href="/book"
          className="mt-2 block min-h-[76px] rounded-xl border border-line-strong bg-canvas px-3.5 py-3 text-[15px] leading-relaxed text-ink transition-colors hover:border-brand-400"
        >
          <span className="sr-only">{t.nav.book}. </span>
          <span aria-hidden>
            {typed}
            {phase === "typing" && <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-caret bg-brand-600" />}
          </span>
        </Link>

        <div className="mt-4 min-h-[156px]" aria-live="polite">
          {phase === "thinking" && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <TypingDots label={t.ai.typing} /> {t.book.analyzing}
            </div>
          )}
          <div className={cn("transition-[opacity,transform] duration-500", showResult ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0")}>
            <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-3.5 ring-1 ring-brand-100">
              <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-600" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-brand-700">{t.landing.widget.recommended}</p>
                <p className="text-base font-semibold text-ink">{spec.name}</p>
                <p className="truncate text-[13px] text-ink-2">{spec.desc}</p>
              </div>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-muted">
              <CalendarDays aria-hidden className="size-3.5" /> {t.landing.widget.nearest} · {t.common.tomorrow}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {times.map((time, i) => (
                <Link
                  key={time}
                  href="/book"
                  tabIndex={phase === "slots" ? 0 : -1}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-medium tabular-nums transition-[opacity,transform,background-color,border-color] duration-300",
                    i === 0 ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink hover:border-ink/40",
                    phase === "slots" ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
                  )}
                  style={{ transitionDelay: phase === "slots" ? `${i * 90}ms` : "0ms" }}
                >
                  {time}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <Link href="/book" className={buttonClass("warm", "md", "mt-4 w-full")}>
          {t.landing.widget.book} <ArrowRight aria-hidden className="btn-arrow size-4" />
        </Link>
      </div>
    </div>
  );
}
