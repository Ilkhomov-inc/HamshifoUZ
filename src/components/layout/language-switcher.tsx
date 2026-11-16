"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/time";

const LABELS: Record<Locale, string> = { uz: "O'zbekcha", ru: "Русский", en: "English" };

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  async function change(next: Locale) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    start(() => router.refresh());
  }

  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">{t.nav.language}</span>
      <Globe aria-hidden className="pointer-events-none absolute left-2.5 size-4 text-muted" />
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => change(e.target.value as Locale)}
        className="h-9 cursor-pointer appearance-none rounded-full border border-line bg-surface pr-8 pl-8 text-sm font-medium text-ink-2 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-sm focus:border-brand-600 focus:outline-none disabled:opacity-60"
      >
        {(Object.keys(LABELS) as Locale[]).map((l) => (
          <option key={l} value={l}>
            {LABELS[l]}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 size-4 text-muted" />
    </label>
  );
}
