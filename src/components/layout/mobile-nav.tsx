"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { SignOutButton, type HeaderUser } from "./user-menu";

export function MobileNav({ user }: { user: HeaderUser | null }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const link = "flex items-center justify-between rounded-xl px-3 py-3 text-[15px] font-medium text-ink hover:bg-ink/5";
  return (
    <div className="xl:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? t.nav.close : t.nav.menu}
        onClick={() => setOpen((v) => !v)}
        className={buttonClass("outline", "icon")}
      >
        {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
      </button>
      {open && (
        <div id="mobile-nav" className="absolute inset-x-0 top-full z-50 animate-fade-up border-b border-line bg-surface px-4 pt-2 pb-5 shadow-pop">
          <nav className="flex flex-col" aria-label={t.nav.menu}>
            <Link className={link} href="/book">{t.nav.book}</Link>
            <Link className={link} href="/explain">{t.nav.explainer}</Link>
            <Link className={link} href="/#pharmacy">
              {t.nav.pharmacy} <Badge tone="warm">{t.nav.soon}</Badge>
            </Link>
            <Link className={link} href="/about-demo">{t.nav.about}</Link>
            {user && (
              <Link className={link} href={user.role === "doctor" ? "/doctor" : "/appointments"}>
                {user.role === "doctor" ? t.nav.dashboard : t.nav.myAppointments}
              </Link>
            )}
          </nav>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-4">
            <LanguageSwitcher />
            {user ? (
              <SignOutButton className={buttonClass("outline", "sm")} />
            ) : (
              <Link href="/signin" className={buttonClass("primary", "sm")}>{t.nav.signIn}</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
