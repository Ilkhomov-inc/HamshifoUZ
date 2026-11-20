import type { Metadata } from "next";
import { Bot, CheckCircle2, FlaskConical, LockKeyhole, Route, TriangleAlert } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { DemoButtons } from "@/components/auth/demo-buttons";
import { demoEnabled } from "@/lib/auth/demo";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.about.title };
}

function Block({ icon: Icon, title, items, tone = "brand" }: { icon: typeof Bot; title: string; items: string[]; tone?: "brand" | "warm" | "ink" }) {
  const color = tone === "warm" ? "bg-warm-100 text-warm-700" : tone === "ink" ? "bg-ink text-white" : "bg-brand-50 text-brand-700";
  return (
    <Card className="reveal p-6">
      <div className="flex items-center gap-3">
        <span className={`flex size-10 items-center justify-center rounded-xl ${color}`}>
          <Icon aria-hidden className="size-5" />
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((it) => (
          <li key={it} className="flex gap-2.5 text-[15px] leading-relaxed text-ink-2">
            <CheckCircle2 aria-hidden className="mt-1 size-4 shrink-0 text-brand-600" /> {it}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default async function AboutDemoPage() {
  const { t } = await getI18n();
  const A = t.about;
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight hyphens-auto sm:text-4xl">{A.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-2">{A.intro}</p>

      <Card className="reveal mt-8 border-brand-200 bg-brand-50/50 p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Route aria-hidden className="size-5" />
          </span>
          <h2 className="text-lg font-semibold">{A.howToTitle}</h2>
        </div>
        <ol className="mt-4 space-y-3">
          {A.howTo.map((s, i) => (
            <li key={s} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-brand-700 ring-1 ring-brand-200">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        {demoEnabled() && (
          <div className="mt-6">
            <DemoButtons />
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Block icon={CheckCircle2} title={A.worksTitle} items={A.works} />
        <Block icon={FlaskConical} title={A.simulatedTitle} items={A.simulated} tone="warm" />
        <Block icon={Bot} title={A.aiTitle} items={A.ai} tone="ink" />
        <Block icon={LockKeyhole} title={A.securityTitle} items={A.security} />
      </div>
      <Card className="reveal mt-5 p-6">
        <div className="flex items-center gap-3">
          <TriangleAlert aria-hidden className="size-5 text-warm-500" />
          <h2 className="text-lg font-semibold">{A.limitsTitle}</h2>
        </div>
        <ul className="mt-3 list-disc space-y-1.5 pl-9 text-[15px] text-ink-2">
          {A.limits.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </Card>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/book" variant="warm">{t.nav.book}</ButtonLink>
        <ButtonLink href="/explain" variant="outline">{t.nav.explainer}</ButtonLink>
      </div>
    </div>
  );
}
