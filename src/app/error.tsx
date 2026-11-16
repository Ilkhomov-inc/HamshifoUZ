"use client";

import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">{t.errors.genericTitle}</h1>
      <p className="mt-2 text-muted">{t.errors.genericText}</p>
      <Button className="mt-6" onClick={reset}>{t.common.retry}</Button>
    </div>
  );
}
