"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { addDays, dateKey, formatDateKey, isoWeekday, monthTitle, weekdayName } from "@/lib/time";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";

function monthOf(key: string) {
  return key.slice(0, 7); // YYYY-MM
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Cal.com-style month grid. Only days with free slots are selectable. */
export function Calendar({
  available,
  selected,
  onSelect,
}: {
  available: Map<string, number>;
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const { locale, t } = useI18n();
  const today = dateKey(new Date());
  const lastDay = addDays(today, 14);
  const [month, setMonth] = useState(() => monthOf(selected ?? today));
  useEffect(() => {
    if (selected) setMonth(monthOf(selected));
  }, [selected]);

  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, i) => weekdayName(i + 1, locale, "short")), [locale]);

  const cells = useMemo(() => {
    const first = `${month}-01`;
    const offset = isoWeekday(first) - 1;
    const [y, m] = month.split("-").map(Number) as [number, number];
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const out: Array<string | null> = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= daysInMonth; d++) out.push(`${month}-${String(d).padStart(2, "0")}`);
    return out;
  }, [month]);

  const title = monthTitle(month, locale);
  const canPrev = month > monthOf(today);
  const canNext = month < monthOf(lastDay);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[15px] font-semibold first-letter:uppercase text-ink" aria-live="polite">
          {title}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label={t.book.prevMonth}
            disabled={!canPrev}
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className={buttonClass("ghost", "icon-sm")}
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t.book.nextMonth}
            disabled={!canNext}
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className={buttonClass("ghost", "icon-sm")}
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
      </div>
      <div role="group" aria-label={title} className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((w) => (
          <div key={w} aria-hidden className="pb-2 text-[11px] font-medium tracking-wide text-muted uppercase">
            {w}
          </div>
        ))}
        {cells.map((key, i) => {
          if (!key) return <div key={`e${i}`} aria-hidden />;
          const count = available.get(key) ?? 0;
          const enabled = count > 0;
          const isSelected = key === selected;
          const isToday = key === today;
          const label = formatDateKey(key, locale);
          return (
            <div key={key}>
              <button
                type="button"
                disabled={!enabled}
                aria-pressed={isSelected}
                aria-label={label}
                onClick={() => onSelect(key)}
                className={cn(
                  "relative mx-auto flex aspect-square w-full max-w-11 items-center justify-center rounded-xl text-sm font-medium tabular-nums transition-[background-color,color,transform] duration-200",
                  enabled && "active:scale-95",
                  enabled && !isSelected && "bg-ink/[0.06] text-ink hover:bg-ink/[0.12]",
                  isSelected && "scale-105 bg-ink text-white shadow-sm",
                  !enabled && "text-muted/60",
                )}
              >
                {Number(key.slice(8))}
                {isToday && (
                  <span aria-hidden className={cn("absolute bottom-1.5 size-1 rounded-full", isSelected ? "bg-white" : "bg-brand-600")} />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
