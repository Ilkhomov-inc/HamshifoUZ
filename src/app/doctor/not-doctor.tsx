import { ShieldAlert } from "lucide-react";
import type { Dict } from "@/lib/i18n";
import { Card } from "@/components/ui/card";

export function NotDoctor({ t }: { t: Dict }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <Card className="p-8 text-center">
        <ShieldAlert aria-hidden className="mx-auto size-8 text-warm-500" />
        <h1 className="mt-4 text-xl font-semibold">{t.doctor.notDoctorTitle}</h1>
        <p className="mt-2 text-sm text-muted">{t.doctor.notDoctorText}</p>
      </Card>
    </div>
  );
}
