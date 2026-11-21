"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { addDays, dateKey, formatDateKey, isoWeekday, monthTitle, weekdayName } from "@/lib/time";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";

export function monthOf(key: string) {
  return key.slice(0, 7); // YYYY-MM
}

export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Cal.com-style month grid. By default only days with free slots are selectable
 * and the arrows reach from this month to 14 days ahead (patient booking).
 * The doctor's date picker passes its own rules.
 */
export function Calendar({
  available,
  selected,
  onSelect,
  isEnabled,
  monthRange,
  inRange,
  today: todayProp,
}: {
  available?: Map<string, number>;
  selected: string | null;
  onSelect: (key: string) => void;
  /** Which days can be picked. Default: days with free slots in `available`. */
  isEnabled?: (key: string) => boolean;
  /** First and last month (YYYY-MM) the arrows can reach. */
  monthRange?: [string, string];
  /** Days drawn as part of the picked range, e.g. the selected week. */
  inRange?: (key: string) => boolean;
  /** Today's date key; pass the server's value to avoid a time-zone mismatch. */
  today?: string;
}) {
  const { locale, t } = useI18n();
  const today = todayProp ?? dateKey(new Date());
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
  const canPrev = month > (monthRange?.[0] ?? monthOf(today));
  const canNext = month < (monthRange?.[1] ?? monthOf(lastDay));

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
          const enabled = isEnabled ? isEnabled(key) : (available?.get(key) ?? 0) > 0;
          const isSelected = key === selected;
          const ranged = !isSelected && (inRange?.(key) ?? false);
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
                  enabled && !isSelected && !ranged && "bg-ink/[0.06] text-ink hover:bg-ink/[0.12]",
                  ranged && "bg-brand-100 text-brand-800 hover:bg-brand-200",
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
