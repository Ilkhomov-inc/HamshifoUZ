import { cn } from "@/lib/cn";
import { TextShimmer } from "@/components/ui/text-shimmer";

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

/** Hamdard AI "thinking" line: the label shimmers in brand teal while the answer is on its way. */
export function HamdardThinking({ text, className }: { text: string; className?: string }) {
  return (
    <span role="status" className={cn("inline-flex", className)}>
      <TextShimmer
        text={text}
        duration={2}
        baseColor="var(--color-muted)"
        shimmerColor="var(--color-brand-400)"
        className="text-sm font-medium"
      />
    </span>
  );
}
