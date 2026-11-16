"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, LayoutGrid, LogOut } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Badge } from "@/components/ui/badge";

export type HeaderUser = { name: string; role: "patient" | "doctor"; isDemo: boolean };

export function initials(name: string) {
  return (
    name
      .replace(/\(.*?\)/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "•"
  );
}

export function SignOutButton({ className = "", onDone }: { className?: string; onDone?: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await fetch("/api/auth/signout", { method: "POST" });
        onDone?.();
        router.push("/");
        router.refresh();
      }}
    >
      <LogOut aria-hidden className="size-4" /> {t.nav.signOut}
    </button>
  );
}

export function UserMenu({ user }: { user: HeaderUser }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-full border border-line bg-surface py-1 pr-2.5 pl-1 text-sm font-medium transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-sm active:scale-[0.98] aria-expanded:border-line-strong aria-expanded:shadow-sm"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
          {initials(user.name)}
        </span>
        <span className="max-w-32 truncate">{user.name.replace(/\s*\(demo\)/i, "") || "—"}</span>
        {user.isDemo && <Badge tone="warm">{t.common.demo}</Badge>}
        <ChevronDown aria-hidden className={`size-4 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-56 animate-fade-up rounded-xl border border-line bg-surface p-1.5 shadow-pop">
          {user.role === "doctor" ? (
            <Link role="menuitem" href="/doctor" className={item} onClick={() => setOpen(false)}>
              <LayoutGrid aria-hidden className="size-4" /> {t.nav.dashboard}
            </Link>
          ) : (
            <Link role="menuitem" href="/appointments" className={item} onClick={() => setOpen(false)}>
              <CalendarDays aria-hidden className="size-4" /> {t.nav.myAppointments}
            </Link>
          )}
          <div className="my-1 h-px bg-line" />
          <SignOutButton className={item} onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
