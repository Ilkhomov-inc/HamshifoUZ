import { cn } from "@/lib/cn";

type Tone = "neutral" | "brand" | "warm" | "danger" | "outline" | "ink";

const tones: Record<Tone, string> = {
  neutral: "bg-ink/[0.05] text-ink-2",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200/70",
  warm: "bg-warm-100 text-warm-700 ring-1 ring-inset ring-warm-200",
  danger: "bg-danger-50 text-danger-700 ring-1 ring-inset ring-danger-200",
  outline: "bg-surface text-ink-2 ring-1 ring-inset ring-line-strong",
  ink: "bg-ink text-white",
};

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}
      {...props}
    />
  );
}
