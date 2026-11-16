import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { ExplainerChat } from "@/components/ai/explainer-chat";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.explain.title };
}

export default async function ExplainPage() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{t.explain.title}</h1>
        <p className="mt-2 text-muted">{t.explain.subtitle}</p>
      </header>
      <ExplainerChat />
    </div>
  );
}
