import { useId } from "react";
import { cn } from "@/lib/cn";

/** Original mark: a leaf-shaped heart with a plus — care that grows. */
export function LogoMark({ className }: { className?: string }) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3fae92" />
          <stop offset="1" stopColor="#0b5f58" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <path
        d="M16 25.5c-.4 0-.8-.1-1.1-.4C10.2 21.2 7 18.3 7 14.4 7 11.4 9.3 9 12.2 9c1.6 0 2.9.7 3.8 1.9.9-1.2 2.2-1.9 3.8-1.9 2.9 0 5.2 2.4 5.2 5.4 0 3.9-3.2 6.8-7.9 10.7-.3.3-.7.4-1.1.4Z"
        fill="#fff"
        fillOpacity="0.95"
      />
      <path d="M16 13.2v6.2M12.9 16.3h6.2" stroke="#0f766e" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight whitespace-nowrap text-ink">
        Hamshifo<span className="text-brand-600"> UZ</span>
      </span>
    </span>
  );
}
