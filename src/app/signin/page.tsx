import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser, safeReturnTo } from "@/lib/auth/session";
import { googleConfigured } from "@/lib/auth/google";
import { demoEnabled } from "@/lib/auth/demo";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { DemoButtons } from "@/components/auth/demo-buttons";
import { GoogleG } from "@/components/auth/google-g";
import { LogoMark } from "@/components/brand/logo";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.signIn };
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string }> }) {
  const sp = await searchParams;
  const returnTo = safeReturnTo(sp.returnTo, "/appointments");
  const [{ t }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  if (user) redirect(user.role === "doctor" && returnTo === "/appointments" ? "/doctor" : returnTo);
  const google = googleConfigured();

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:py-20">
      <Card className="p-6 sm:p-8">
        <LogoMark className="size-10" />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">{t.signin.title}</h1>
        <p className="mt-1 text-muted">{t.signin.subtitle}</p>
        {sp.error && (
          <p role="alert" className="mt-5 rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-700 ring-1 ring-danger-200">
            {sp.error === "google" && !google ? t.signin.googleUnavailable : t.signin.error}
          </p>
        )}
        <div className="mt-6">
          {google ? (
            <a href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`} className={buttonClass("outline", "lg", "w-full")}>
              <GoogleG /> {t.signin.google}
            </a>
          ) : (
            <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-muted ring-1 ring-line">{t.signin.googleUnavailable}</p>
          )}
        </div>
        {demoEnabled() && (
          <>
            <div className="my-6 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" /> {t.common.or} <span className="h-px flex-1 bg-line" />
            </div>
            <p className="font-semibold text-ink">{t.signin.demoTitle}</p>
            <p className="mt-1 mb-4 text-sm text-muted">{t.signin.demoText}</p>
            <DemoButtons compact={false} next={returnTo} />
          </>
        )}
        <p className="mt-6 text-xs leading-relaxed text-muted">{t.signin.note}</p>
      </Card>
    </div>
  );
}
