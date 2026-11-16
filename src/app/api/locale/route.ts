import { z } from "zod";
import { cookies } from "next/headers";
import { apiError, isSameOrigin, readJson } from "@/lib/security";
import { LOCALES } from "@/lib/validation";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return apiError("bad_origin", 403);
  const json = await readJson(req, 200);
  if (json instanceof Response) return json;
  const parsed = z.object({ locale: z.enum(LOCALES) }).safeParse(json);
  if (!parsed.success) return apiError("validation", 400);
  (await cookies()).set("hs_locale", parsed.data.locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 86400,
  });
  return Response.json({ ok: true });
}
