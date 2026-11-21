"use client";

import { useEffect } from "react";

const GLASS = ".btn, .chip, .glass, .glass-card, [data-slot='button']";

/**
 * Liquid glass follows the mouse: one document-level listener writes the pointer
 * position into the hovered glass element (--mx / --my, in its own unscaled
 * pixels), where CSS draws a moving glare. It also sets --glass-scale so wide
 * buttons grow a few pixels on hover instead of a full 5%.
 * Mouse and pen only; touch screens keep the static glass.
 */
export function GlassPointer() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    let last: PointerEvent | null = null;

    const apply = () => {
      frame = 0;
      const e = last;
      if (!e || !(e.target instanceof Element)) return;
      const el = e.target.closest<HTMLElement>(GLASS);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = el.offsetWidth || r.width;
      const h = el.offsetHeight || r.height;
      // The rect is scaled while hovered; map back to the element's own pixels.
      const x = ((e.clientX - r.left) / r.width) * w;
      const y = ((e.clientY - r.top) / r.height) * h;
      el.style.setProperty("--mx", `${x.toFixed(1)}px`);
      el.style.setProperty("--my", `${y.toFixed(1)}px`);
      el.style.setProperty("--glass-scale", Math.min(1.05, 1 + 14 / Math.max(w, 1)).toFixed(3));
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      last = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
