import { z } from "zod";
import { listDoctors } from "@/lib/data/catalog";
import { getCurrentUser } from "@/lib/auth/session";
import { apiError } from "@/lib/security";
import { SPECIALTIES } from "@/lib/ai/specialties";

const query = z.object({
  specialty: z.enum(SPECIALTIES).optional(),
  city: z.enum(["fergana", "margilan", "kokand"]).optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = query.safeParse({
    specialty: url.searchParams.get("specialty") || undefined,
    city: url.searchParams.get("city") || undefined,
  });
  if (!parsed.success) return apiError("validation", 400);
  const user = await getCurrentUser();
  try {
    const doctors = await listDoctors(user?.id ?? null, parsed.data);
    return Response.json({ doctors });
  } catch {
    return apiError("server", 500);
  }
}
