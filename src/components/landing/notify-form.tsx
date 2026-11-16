"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export function NotifyForm() {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) return;
    setState("busy");
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, consent: true, locale, company }),
    }).catch(() => null);
    setState(res?.ok ? "done" : "error");
  }

  if (state === "done") {
    return (
      <p role="status" className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800 ring-1 ring-brand-100">
        <Check aria-hidden className="size-4" /> {t.landing.notifyDone}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <p className="text-sm font-semibold text-ink">{t.landing.notifyTitle}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="notify-email">
          {t.landing.notifyPlaceholder}
        </label>
        <Input
          id="notify-email"
          type="email"
          required
          autoComplete="email"
          maxLength={254}
          placeholder={t.landing.notifyPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" loading={state === "busy"} disabled={!consent || !email.includes("@")} className="shrink-0">
          {t.landing.notifyButton}
        </Button>
      </div>
      {/* honeypot for bots — hidden from people and assistive tech */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        name="company"
      />
      <label className="flex items-start gap-2.5 text-[13px] leading-snug text-muted">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-brand-600"
        />
        {t.landing.notifyConsent}
      </label>
      {state === "error" && (
        <p role="alert" className="text-sm text-danger-600">
          {t.landing.notifyError}
        </p>
      )}
    </form>
  );
}
