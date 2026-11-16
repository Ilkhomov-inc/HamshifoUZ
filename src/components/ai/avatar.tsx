import { cn } from "@/lib/cn";

/** Hamdard AI avatar — a soft speech-bubble with a heartbeat, drawn in-house. */
export function HamdardAvatar({ className, pulse = false }: { className?: string; pulse?: boolean }) {
  return (
    <span className={cn("relative inline-flex size-9 shrink-0 items-center justify-center", className)} aria-hidden>
      {pulse && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-300/50" />}
      <span className="relative inline-flex size-full items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-sm ring-2 ring-white">
        <svg viewBox="0 0 24 24" className="size-[58%]" fill="none">
          <path
            d="M4 12.5c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8c-1.2 0-2.4-.3-3.4-.8L5 20.5l1-3.2a7.9 7.9 0 0 1-2-4.8Z"
            fill="currentColor"
            fillOpacity="0.18"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M7.5 12.5h2l1.3-2.6 2 5 1.4-2.4h2.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

export function TypingDots({ label }: { label: string }) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-dot rounded-full bg-brand-600" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}
