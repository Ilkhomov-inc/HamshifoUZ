"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { addDays, formatDateKey, startOfWeek } from "@/lib/time";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";
import { Calendar, monthOf, shiftMonth } from "@/components/booking/calendar";

/**
 * Doctor schedule navigation: ‹ [date ▾] ›. The middle button opens a month
 * calendar; picking a day (or "Today" inside it) opens that day or week.
 * The panel is positioned against the nearest `relative` ancestor (the toolbar),
 * so on phones it spans the toolbar instead of running off the screen.
 */
export function DateNav({ view, date, today }: { view: "day" | "week"; date: string; today: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const step = view === "week" ? 7 : 1;
  const href = (d: string) => `/doctor?view=${view}&date=${d}`;
  const weekStart = startOfWeek(date);
  const weekEnd = addDays(weekStart, 5); // the schedule shows Monday to Saturday
  const thisMonth = monthOf(today);

  const label =
    view === "week"
      ? weekStart === startOfWeek(today)
        ? t.doctor.today
        : `${formatDateKey(weekStart, locale, { weekday: undefined, month: "short" })} – ${formatDateKey(weekEnd, locale, { weekday: undefined, month: "short" })}`
      : date === today
        ? t.doctor.today
        : formatDateKey(date, locale, { weekday: "short", month: "short" });

  function close(refocus = true) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }
  function go(key: string) {
    close();
    if (key === date) return;
    startTransition(() => router.push(href(key), { scroll: false }));
  }

  // Focus the panel on open; Esc and clicks outside close it.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true });
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1 transition-opacity", pending && "opacity-60")}>
      <Link href={href(addDays(date, -step))} scroll={false} aria-label={t.doctor.prev} className={buttonClass("ghost", "icon-sm")}>
        <ChevronLeft aria-hidden className="size-4" />
      </Link>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t.doctor.pickDate}: ${label}`}
        onClick={() => (open ? close() : setOpen(true))}
        className={buttonClass("ghost", "sm", cn("gap-1.5", open && "bg-white/60"))}
      >
        <CalendarDays aria-hidden className="size-4 text-brand-700" />
        <span className="first-letter:uppercase">{label}</span>
      </button>
      <Link href={href(addDays(date, step))} scroll={false} aria-label={t.doctor.next} className={buttonClass("ghost", "icon-sm")}>
        <ChevronRight aria-hidden className="size-4" />
      </Link>

      <AnimatePresence>
        {open && (
          <m.div
            ref={panelRef}
            role="dialog"
            aria-label={t.doctor.pickDate}
            tabIndex={-1}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 520, damping: 36 }}
            className="absolute inset-x-0 top-full z-50 mt-2 origin-top rounded-2xl border border-line bg-surface p-4 shadow-pop focus:outline-none md:left-auto md:w-80 md:origin-top-right"
          >
            <Calendar
              selected={date}
              today={today}
              onSelect={go}
              isEnabled={() => true}
              monthRange={[shiftMonth(thisMonth, -12), shiftMonth(thisMonth, 12)]}
              inRange={view === "week" ? (k) => k >= weekStart && k <= weekEnd : undefined}
            />
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
              <span className="text-xs text-muted">{view === "week" ? t.doctor.week : t.doctor.day}</span>
              <button type="button" onClick={() => go(today)} className={buttonClass("soft", "sm")}>
                {t.doctor.today}
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
