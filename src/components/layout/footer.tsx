import Link from "next/link";
import { Phone } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { Logo } from "@/components/brand/logo";

export async function Footer() {
  const { t } = await getI18n();
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">Hamshifo UZ — {t.tagline}</p>
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-muted">{t.footer.note}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-col items-start gap-1 text-sm">
          <Link className="rounded-md py-1 text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline" href="/book">{t.nav.book}</Link>
          <Link className="rounded-md py-1 text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline" href="/explain">{t.nav.explainer}</Link>
          <Link className="rounded-md py-1 text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline" href="/about-demo">{t.footer.about}</Link>
          <Link className="rounded-md py-1 text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline" href="/privacy">{t.footer.privacy}</Link>
        </nav>
        <div>
          <a
            href="tel:103"
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-danger-50 px-4 py-2 text-sm font-semibold text-danger-700 ring-1 ring-danger-200 transition-[background-color,box-shadow,transform] duration-200 hover:bg-danger-100 hover:shadow-sm active:scale-[0.98]"
          >
            <Phone aria-hidden className="size-4" /> {t.footer.emergency}
          </a>
        </div>
      </div>
    </footer>
  );
}
