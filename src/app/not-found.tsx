import { getI18n } from "@/lib/i18n/server";
import { ButtonLink } from "@/components/ui/button";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-6xl font-semibold text-brand-200">404</p>
      <h1 className="mt-4 text-2xl font-semibold">{t.errors.notFoundTitle}</h1>
      <p className="mt-2 text-muted">{t.errors.notFoundText}</p>
      <ButtonLink href="/" className="mt-6">{t.errors.home}</ButtonLink>
    </div>
  );
}
