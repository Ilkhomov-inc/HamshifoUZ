"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, RotateCcw, UserX } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { MAX_NOTE } from "@/lib/validation-client";
import { Button } from "@/components/ui/button";
import { Hint, Label, Textarea } from "@/components/ui/field";

export function NoteForm({ id, initial, status }: { id: string; initial: string; status: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  async function save(nextStatus: "completed" | "no_show" | "booked") {
    setBusy(nextStatus);
    setError(false);
    setSaved(false);
    const res = await fetch(`/api/doctor/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendations: nextStatus === "completed" ? text : text.trim() ? text : null, status: nextStatus }),
    }).catch(() => null);
    setBusy(null);
    if (res?.ok) {
      setSaved(true);
      router.refresh();
    } else setError(true);
  }

  return (
    <div>
      <Label htmlFor="note">{t.doctor.recommendationsLabel}</Label>
      <Textarea
        id="note"
        rows={9}
        maxLength={MAX_NOTE}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        placeholder={t.doctor.recommendationsPlaceholder}
        aria-describedby="note-hint"
      />
      <div className="mt-1.5 flex justify-between gap-4">
        <Hint id="note-hint" className="mt-0">
          {t.doctor.recommendationsHint}
        </Hint>
        <span className="shrink-0 text-xs text-muted tabular-nums">
          {text.length}/{MAX_NOTE}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button
          variant="warm"
          icon={<Check aria-hidden className="size-4" />}
          loading={busy === "completed"}
          disabled={(busy !== null && busy !== "completed") || text.trim().length === 0}
          onClick={() => save("completed")}
        >
          {t.doctor.saveComplete}
        </Button>
        {status !== "no_show" && (
          <Button
            variant="outline"
            icon={<UserX aria-hidden className="size-4" />}
            loading={busy === "no_show"}
            disabled={busy !== null && busy !== "no_show"}
            onClick={() => save("no_show")}
          >
            {t.doctor.markNoShow}
          </Button>
        )}
        {status !== "booked" && (
          <Button
            variant="ghost"
            icon={<RotateCcw aria-hidden className="size-4" />}
            loading={busy === "booked"}
            disabled={busy !== null && busy !== "booked"}
            onClick={() => save("booked")}
          >
            {t.doctor.reopen}
          </Button>
        )}
        <span aria-live="polite" className="text-sm font-medium">
          {saved && <span className="inline-flex animate-fade-in items-center gap-1 text-brand-700"><Check aria-hidden className="size-4" /> {t.common.saved}</span>}
          {error && <span className="text-danger-600">{t.doctor.saveError}</span>}
        </span>
      </div>
    </div>
  );
}
