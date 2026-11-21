"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";
import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/time";

const LABELS: Record<Locale, string> = { uz: "O'zbekcha", ru: "Русский", en: "English" };

export function LanguageSwitcher({ className = "", align = "right" }: { className?: string; align?: "left" | "right" }) {
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
    <Dropdown
      value={locale}
      onChange={change}
      label={t.nav.language}
      icon={<Globe aria-hidden />}
      align={align}
      size="sm"
      disabled={pending}
      options={(Object.keys(LABELS) as Locale[]).map((l) => ({ value: l, label: LABELS[l] }))}
      className={className}
    />
  );
}
