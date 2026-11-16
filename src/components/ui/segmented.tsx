"use client";

import { useId, useRef } from "react";
import * as m from "motion/react-m";
import { cn } from "@/lib/cn";

type Option<T extends string> = { value: T; label: React.ReactNode };

/**
 * Pill-shaped one-of-many switch with a sliding thumb.
 * Keyboard: one Tab stop; arrows, Home and End move the selection (WAI-ARIA radio group / tabs).
 * For `kind="tabs"` pass `idBase` and label the panel with `aria-labelledby={`${idBase}-${value}`}`.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  kind = "radio",
  idBase,
  className,
}: {
  options: Array<Option<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  kind?: "radio" | "tabs";
  idBase?: string;
  className?: string;
}) {
  const uid = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const last = options.length - 1;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = i === last ? 0 : i + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = i === 0 ? last : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  }

  const tabs = kind === "tabs";
  return (
    <div role={tabs ? "tablist" : "radiogroup"} aria-label={label} className={cn("segmented", className)}>
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role={tabs ? "tab" : "radio"}
            id={idBase ? `${idBase}-${o.value || "all"}` : undefined}
            aria-selected={tabs ? active : undefined}
            aria-controls={tabs && idBase ? `${idBase}-panel` : undefined}
            aria-checked={tabs ? undefined : active}
            tabIndex={active ? 0 : -1}
            data-active={active}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className="segmented-item"
          >
            {active && (
              <m.span
                layoutId={`${uid}-thumb`}
                aria-hidden
                className="segmented-thumb"
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
              />
            )}
            <span className="segmented-label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
