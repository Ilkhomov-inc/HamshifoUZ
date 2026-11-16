"use client";

import { Phone, TriangleAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { buttonClass } from "@/components/ui/button";

/** Prominent 103 banner. Shown whenever the deterministic rule (or the model) flags an emergency. */
export function EmergencyBanner({ onContinue, compact = false }: { onContinue?: () => void; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="animate-fade-up overflow-hidden rounded-2xl border-2 border-danger-600 bg-danger-50 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-600 text-white">
          <TriangleAlert aria-hidden className="size-5" />
        </span>
        <h2 className="text-lg leading-snug font-semibold text-danger-700">{t.book.emergencyTitle}</h2>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-ink">{t.book.emergencyText}</p>
      <a
        href="tel:103"
        className={buttonClass("danger", "lg", "mt-4 flex w-full sm:inline-flex sm:w-auto")}
      >
        <Phone aria-hidden className="size-5 shrink-0" /> {t.common.call103}
      </a>
      {!compact && onContinue && (
        <button type="button" onClick={onContinue} className="mt-3 -ml-2 block rounded-lg px-2 py-2 text-left text-sm font-medium text-ink-2 underline underline-offset-4 transition-colors hover:bg-danger-100 hover:text-ink">
          {t.book.emergencyContinue}
        </button>
      )}
    </div>
  );
}
