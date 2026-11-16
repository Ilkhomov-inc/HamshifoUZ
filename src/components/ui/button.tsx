import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/card";

export type ButtonVariant = "primary" | "warm" | "outline" | "ghost" | "danger" | "soft";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

/** Styles live in globals.css (`.btn`, `.btn-<variant>`, `.btn-<size>`). */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn("btn", `btn-${variant}`, `btn-${size}`, className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and ignores clicks. The button keeps keyboard focus, unlike `disabled`. */
  loading?: boolean;
  /** Leading icon; the spinner takes its place while loading, so the label never jumps. */
  icon?: React.ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", loading = false, icon, onClick, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      data-loading={loading || undefined}
      onClick={(e) => {
        if (loading) {
          e.preventDefault(); // also stops a second form submit
          return;
        }
        onClick?.(e);
      }}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  prefetch,
  ...rest
}: { href: string; variant?: ButtonVariant; size?: ButtonSize; className?: string; children: React.ReactNode; prefetch?: boolean } & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
>) {
  return (
    <Link href={href} prefetch={prefetch} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
