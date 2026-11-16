"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Stethoscope, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export async function demoLogin(role: "patient" | "doctor"): Promise<string | null> {
  const res = await fetch("/api/auth/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { redirect?: string };
  return body.redirect ?? "/";
}

/** One-click demo logins. `stay` keeps the user on the current page (used inside the booking flow). */
export function DemoButtons({
  roles = ["patient", "doctor"],
  stay = false,
  compact = false,
  next,
}: {
  roles?: Array<"patient" | "doctor">;
  stay?: boolean;
  compact?: boolean;
  next?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function go(role: "patient" | "doctor") {
    setBusy(role);
    setError(false);
    const redirect = await demoLogin(role);
    if (!redirect) {
      setError(true);
      setBusy(null);
      return;
    }
    if (stay) {
      router.refresh();
      setBusy(null);
    } else {
      router.push(next && role === "patient" ? next : redirect);
      router.refresh();
    }
  }

  return (
    <div className="@container">
      <div className={cn("grid gap-3", roles.length > 1 && !compact && "@xl:grid-cols-2")}>
        {roles.map((role) => {
          const Icon = role === "patient" ? UserRound : Stethoscope;
          return (
            <button
              key={role}
              type="button"
              onClick={() => go(role)}
              disabled={busy !== null}
              aria-busy={busy === role || undefined}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                {busy === role ? <Spinner className="size-5" /> : <Icon aria-hidden className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-ink">
                  {role === "patient" ? t.signin.demoPatient : t.signin.demoDoctor}
                  <Badge tone="warm">{t.signin.demoBadge}</Badge>
                </span>
                {!compact && (
                  <span className="mt-0.5 block text-[13px] text-muted">
                    {role === "patient" ? t.signin.demoPatientText : t.signin.demoDoctorText}
                  </span>
                )}
              </span>
              <ArrowRight aria-hidden className="btn-arrow size-4 shrink-0 text-muted group-hover:text-brand-700" />
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger-600">
          {t.signin.error}
        </p>
      )}
    </div>
  );
}
