"use client";

import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";

/** Symptoms → Specialist → Slot → Done. Progress bar animates with scaleX (GPU). */
export function StepIndicator({ current, complete = false }: { current: 0 | 1 | 2 | 3; complete?: boolean }) {
  const { t } = useI18n();
  const labels = [t.steps.symptoms, t.steps.specialist, t.steps.slot, t.steps.done];
  return (
    <nav aria-label="Progress" className="relative w-full">
      <div aria-hidden className="absolute top-4 right-[12.5%] left-[12.5%] h-0.5 rounded-full bg-line">
        <div
          className="h-full origin-left rounded-full bg-brand-600 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `scaleX(${current / 3})` }}
        />
      </div>
      <ol className="relative grid grid-cols-4">
        {labels.map((label, i) => {
          const done = i < current || (complete && i === current);
          const active = i === current && !complete;
          return (
            <li key={label} className="relative flex flex-col items-center gap-2" aria-current={active ? "step" : undefined}>
              <span
                className={cn(
                  "relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-500",
                  done && "border-brand-600 bg-brand-600 text-white",
                  active && "scale-110 border-brand-600 bg-surface text-brand-700 shadow-[0_0_0_5px_rgb(15_118_110/0.12)]",
                  !done && !active && "border-line-strong bg-surface text-muted",
                )}
              >
                {done ? <Check aria-hidden className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("text-center text-xs font-medium sm:text-[13px]", active ? "text-ink" : "text-muted")}>
                {label}
                {done && <span className="sr-only"> ✓</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
