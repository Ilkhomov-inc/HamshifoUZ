import { z } from "zod";
import { availableSlots } from "@/lib/data/catalog";
import { getCurrentUser } from "@/lib/auth/session";
import { apiError } from "@/lib/security";
import { dateKey } from "@/lib/time";
import { dateKeySchema } from "@/lib/validation";

const query = z.object({
  doctorId: z.uuid(),
  from: dateKeySchema.optional(),
  days: z.coerce.number().int().min(1).max(15).optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = query.safeParse({
    doctorId: url.searchParams.get("doctorId"),
    from: url.searchParams.get("from") || undefined,
    days: url.searchParams.get("days") || undefined,
  });
  if (!parsed.success) return apiError("validation", 400);
  const user = await getCurrentUser();
  try {
    const slots = await availableSlots(user?.id ?? null, parsed.data.doctorId, parsed.data.from ?? dateKey(new Date()), parsed.data.days ?? 15);
    return Response.json({ slots });
  } catch {
    return apiError("server", 500);
  }
}
