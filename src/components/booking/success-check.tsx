/** Animated confirmation check (SVG stroke drawing + pop; static under reduced motion). */
export function SuccessCheck() {
  return (
    <div className="relative mx-auto size-20">
      <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-300/60 [animation-iteration-count:2]" />
      <svg viewBox="0 0 64 64" className="relative size-20 animate-pop" aria-hidden>
        <circle cx="32" cy="32" r="30" fill="var(--color-brand-600)" />
        <path className="check-draw" d="M19 33.5 27.5 42 45 23" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
