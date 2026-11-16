"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";

export function CancelButton({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [gone, setGone] = useState(false);

  async function cancel() {
    setBusy(true);
    setError(false);
    setGone(true); // optimistic
    const res = await fetch(`/api/appointments/${id}/cancel`, { method: "POST" }).catch(() => null);
    if (!res?.ok) {
      setGone(false);
      setError(true);
    }
    setBusy(false);
    setConfirming(false);
    router.refresh();
  }

  if (gone) return <span className="text-sm font-medium text-muted">{t.status.cancelled}</span>;
  if (!confirming) {
    return (
      <>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
          {t.appointments.cancel}
        </Button>
        {error && <span role="alert" className="text-xs text-danger-600">{t.appointments.cancelError}</span>}
      </>
    );
  }
  return (
    <span role="group" aria-label={t.appointments.cancelConfirm} className="flex w-full animate-fade-in flex-wrap items-center gap-x-3 gap-y-1.5 sm:justify-end">
      <span className="text-sm text-ink-2">{t.appointments.cancelConfirm}</span>
      {/* the two answers always stay side by side */}
      <span className="inline-flex items-center gap-1.5">
        <Button variant="danger" size="sm" onClick={cancel} loading={busy}>
          {t.appointments.cancelYes}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          {t.appointments.cancelNo}
        </Button>
      </span>
    </span>
  );
}
