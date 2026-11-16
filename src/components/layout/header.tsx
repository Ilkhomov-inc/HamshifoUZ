import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { UserMenu, type HeaderUser } from "./user-menu";

export async function Header() {
  const [{ t }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const headerUser: HeaderUser | null = user ? { name: user.fullName || user.email || "", role: user.role, isDemo: user.isDemo } : null;
  const link = "rounded-full px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink";

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/95">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Hamshifo UZ" className="rounded-lg">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-0.5 whitespace-nowrap xl:flex">
          <Link className={link} href="/book">{t.nav.book}</Link>
          <Link className={link} href="/explain">{t.nav.explainer}</Link>
          <Link className={`${link} inline-flex items-center gap-1.5`} href="/#pharmacy">
            {t.nav.pharmacy} <Badge tone="warm">{t.nav.soon}</Badge>
          </Link>
          <Link className={link} href="/about-demo">{t.nav.about}</Link>
        </nav>
        <div className="hidden items-center gap-2 xl:flex">
          <LanguageSwitcher />
          {headerUser ? (
            <UserMenu user={headerUser} />
          ) : (
            <ButtonLink href="/signin" size="sm">{t.nav.signIn}</ButtonLink>
          )}
        </div>
        <MobileNav user={headerUser} />
      </div>
    </header>
  );
}
