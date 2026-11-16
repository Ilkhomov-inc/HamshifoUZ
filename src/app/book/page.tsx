import type { Metadata } from "next";
import { z } from "zod";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDoctor } from "@/lib/data/catalog";
import { isSpecialty } from "@/lib/ai/specialties";
import { googleConfigured } from "@/lib/auth/google";
import { demoEnabled } from "@/lib/auth/demo";
import { BookingFlow } from "@/components/booking/booking-flow";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.book.title };
}

export default async function BookPage({ searchParams }: { searchParams: Promise<{ doctor?: string; specialty?: string }> }) {
  const sp = await searchParams;
  const [{ t }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const doctorId = z.uuid().safeParse(sp.doctor);
  const initialDoctor = doctorId.success ? await getDoctor(user?.id ?? null, doctorId.data).catch(() => null) : null;
  const initialSpecialty = isSpecialty(sp.specialty) ? sp.specialty : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-6 sm:px-6">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.book.title}</h1>
        <p className="mt-2 text-muted">{t.book.subtitle}</p>
      </header>
      <BookingFlow
        user={user ? { name: user.fullName, isDemo: user.isDemo } : null}
        initialDoctor={initialDoctor}
        initialSpecialty={initialSpecialty}
        googleEnabled={googleConfigured()}
        demoEnabled={demoEnabled()}
      />
    </div>
  );
}
