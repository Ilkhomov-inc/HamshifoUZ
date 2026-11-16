import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";

export async function DemoBanner() {
  const { t } = await getI18n();
  return (
    <div className="on-dark bg-ink text-white">
      <p className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-2 text-[12.5px] leading-snug sm:items-center sm:px-6">
        <FlaskConical aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warm-300 sm:mt-0" />
        <span>
          {t.demoBanner.text}{" "}
          <Link href="/about-demo" className="rounded-sm font-semibold text-warm-300 underline decoration-warm-300/50 underline-offset-2 transition-colors hover:decoration-warm-300">
            {t.demoBanner.link}
          </Link>
        </span>
      </p>
    </div>
  );
}
