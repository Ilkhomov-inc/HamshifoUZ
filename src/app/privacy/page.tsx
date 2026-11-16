import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { Card } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.privacy.title };
}

export default async function PrivacyPage() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight">{t.privacy.title}</h1>
      <div className="mt-8 grid gap-4">
        {t.privacy.items.map((it) => (
          <Card key={it.title} className="p-5">
            <h2 className="font-semibold">{it.title}</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{it.text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
