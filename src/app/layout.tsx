import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { MotionProvider } from "@/components/layout/motion-provider";
import { RevealObserver } from "@/components/layout/reveal-observer";
import { GlassPointer } from "@/components/layout/glass-pointer";
import { DemoBanner } from "@/components/layout/demo-banner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const inter = Inter({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-inter", display: "swap" });

const HTML_LANG = { uz: "uz-Latn", ru: "ru", en: "en" } as const;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  let metadataBase: URL | undefined;
  try {
    metadataBase = process.env.APP_URL ? new URL(process.env.APP_URL) : undefined;
  } catch {
    metadataBase = undefined;
  }
  return {
    metadataBase,
    title: { default: t.meta.title, template: "%s · Hamshifo UZ" },
    description: t.meta.description,
    applicationName: "Hamshifo UZ",
    openGraph: { title: t.meta.title, description: t.meta.description, siteName: "Hamshifo UZ", type: "website" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7faf8",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n();
  return (
    <html lang={HTML_LANG[locale]} className={inter.variable}>
      <body className="min-h-dvh font-sans">
        <I18nProvider locale={locale} dict={t}>
          <MotionProvider>
            <a
              href="#main"
              className="sr-only z-[60] rounded-full bg-ink px-4 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
            >
              {t.nav.skip}
            </a>
            <DemoBanner />
            <Header />
            <main id="main">{children}</main>
            <Footer />
            <RevealObserver />
            <GlassPointer />
          </MotionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
