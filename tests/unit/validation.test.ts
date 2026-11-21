import { describe, expect, it } from "vitest";
import { formatPhoneInput } from "@/lib/validation-client";
import { bookingRequestSchema, explainRequestSchema, nameSchema, normalizePhone, routeRequestSchema } from "@/lib/validation";

describe("input validation", () => {
  it("normalizes Uzbek phone numbers", () => {
    expect(normalizePhone("+998 90 123 45 67")).toBe("+998901234567");
    expect(normalizePhone("998901234567")).toBe("+998901234567");
    expect(normalizePhone("(90) 123-45-67")).toBe("+998901234567");
    expect(normalizePhone("+7 900 123 45 67")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("+998 90 123 45 6a")).toBeNull();
    expect(normalizePhone("+998 90 123 4")).toBeNull(); // incomplete, must not become +998998901234
    expect(normalizePhone("+901234567")).toBeNull();
  });

  it("masks the phone field as +998 XX XXX XX XX", () => {
    expect(formatPhoneInput("")).toBe("+998 ");
    expect(formatPhoneInput("+998 901")).toBe("+998 90 1");
    expect(formatPhoneInput("901234567")).toBe("+998 90 123 45 67");
    expect(formatPhoneInput("+998901234567")).toBe("+998 90 123 45 67");
    expect(formatPhoneInput("+998 90 123 45 678")).toBe("+998 90 123 45 67");
  });

  it("validates names (Latin and Cyrillic, apostrophes)", () => {
    expect(nameSchema.safeParse("Ulug'bek Sharipov").success).toBe(true);
    expect(nameSchema.safeParse("Oʻgʻiloy Qodirova").success).toBe(true);
    expect(nameSchema.safeParse("Азиза Каримова").success).toBe(true);
    expect(nameSchema.safeParse("A").success).toBe(false);
    expect(nameSchema.safeParse("<script>alert(1)</script>").success).toBe(false);
    expect(nameSchema.safeParse("x".repeat(81)).success).toBe(false);
  });

  it("caps symptom text length and requires consent for bookings", () => {
    expect(routeRequestSchema.safeParse({ text: "a".repeat(1501), locale: "uz" }).success).toBe(false);
    expect(routeRequestSchema.safeParse({ text: "ok", locale: "uz" }).success).toBe(false);
    const base = { slotId: "8e7b8a2e-3a0a-4b8e-9c55-2a7d2b1d3c4e", name: "Aziza Karimova", phone: "+998 90 123 45 67", symptoms: "" };
    expect(bookingRequestSchema.safeParse({ ...base, consent: true }).success).toBe(true);
    expect(bookingRequestSchema.safeParse({ ...base, consent: false }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...base, slotId: "1; drop table", consent: true }).success).toBe(false);
  });

  it("explainer accepts only safe image payloads", () => {
    expect(explainRequestSchema.safeParse({ locale: "en", image: { mediaType: "image/gif", data: "AAAA" } }).success).toBe(false);
    expect(explainRequestSchema.safeParse({ locale: "en", image: { mediaType: "image/jpeg", data: "AA<A" } }).success).toBe(false);
    expect(explainRequestSchema.safeParse({ locale: "en", image: { mediaType: "image/jpeg", data: "QUJD" } }).success).toBe(true);
    expect(explainRequestSchema.safeParse({ locale: "en" }).success).toBe(false);
  });
});
