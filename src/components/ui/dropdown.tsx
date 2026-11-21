"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type DropdownOption<T extends string> = { value: T; label: string; hint?: string };

/**
 * Pill button that opens a styled list (replaces native <select>).
 * Keyboard: Enter/Space/arrows open; arrows, Home, End and first-letter typing move; Enter picks; Esc/Tab close.
 */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  label,
  icon,
  align = "left",
  disabled = false,
  size = "md",
  className,
}: {
  value: T;
  options: Array<DropdownOption<T>>;
  onChange: (value: T) => void;
  /** Accessible name, e.g. "Language". */
  label: string;
  icon?: React.ReactNode;
  /** "end": opens leftward-anchored on phones, right-anchored from the sm breakpoint. */
  align?: "left" | "right" | "end";
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const current = options[selectedIndex];

  function show(index = selectedIndex) {
    if (disabled) return;
    setActive(index);
    setOpen(true);
  }
  function close(refocus = true) {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }
  function pick(i: number) {
    const o = options[i];
    if (o && o.value !== value) onChange(o.value);
    close();
  }

  // Focus the list when it opens and keep the active option in view.
  useEffect(() => {
    if (open) listRef.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  // Click or tap outside closes.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function onButtonKey(e: React.KeyboardEvent) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      show(e.key === "ArrowUp" ? Math.max(0, selectedIndex - 1) : selectedIndex);
    }
  }

  function onListKey(e: React.KeyboardEvent) {
    const last = options.length - 1;
    if (e.key === "ArrowDown") setActive((i) => Math.min(last, i + 1));
    else if (e.key === "ArrowUp") setActive((i) => Math.max(0, i - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(last);
    else if (e.key === "Enter" || e.key === " ") pick(active);
    else if (e.key === "Escape") close();
    else if (e.key === "Tab") return close(false);
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      const k = e.key.toLowerCase();
      const n = options.length;
      for (let step = 1; step <= n; step++) {
        const i = (active + step) % n;
        if (options[i]!.label.toLowerCase().startsWith(k)) {
          setActive(i);
          break;
        }
      }
    } else return;
    e.preventDefault();
  }

  return (
    <div ref={rootRef} className={cn("relative inline-block max-w-full", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${uid}-list`}
        aria-label={`${label}: ${current?.label ?? ""}`}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={onButtonKey}
        className={cn(
          "glass group inline-flex max-w-full cursor-pointer items-center gap-2 rounded-full border font-medium text-ink transition-[border-color,box-shadow,background-color,transform] duration-300",
          "hover:shadow-sm focus-visible:border-brand-600 focus-visible:ring-4 focus-visible:ring-brand-600/15 focus-visible:outline-none disabled:cursor-default disabled:opacity-60",
          open ? "border-brand-600 shadow-sm ring-4 ring-brand-600/15" : "border-transparent",
          size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-4 text-[15px]",
        )}
      >
        {icon && <span className="flex shrink-0 text-muted [&>svg]:size-4">{icon}</span>}
        <span className="min-w-0 truncate">{current?.label}</span>
        <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <m.ul
            ref={listRef}
            id={`${uid}-list`}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            aria-activedescendant={`${uid}-opt-${active}`}
            onKeyDown={onListKey}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 560, damping: 36 }}
            className={cn(
              "absolute top-full z-50 mt-2 max-h-[min(22rem,60vh)] w-max max-w-[min(20rem,calc(100vw-2rem))] min-w-full overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-1.5 shadow-pop focus:outline-none",
              align === "right" ? "right-0 origin-top-right" : align === "end" ? "left-0 origin-top-left sm:right-0 sm:left-auto sm:origin-top-right" : "left-0 origin-top-left",
            )}
          >
            {options.map((o, i) => {
              const selected = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${uid}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={selected}
                  onPointerMove={() => setActive(i)}
                  onClick={() => pick(i)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                    i === active ? "bg-brand-50 text-ink" : "text-ink-2",
                    selected && "font-semibold text-brand-800",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{o.label}</span>
                    {o.hint && <span className="block truncate text-xs font-normal text-muted">{o.hint}</span>}
                  </span>
                  <Check aria-hidden className={cn("size-4 shrink-0 text-brand-700", selected ? "opacity-100" : "opacity-0")} />
                </li>
              );
            })}
          </m.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
