import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { routeSymptoms, type RouterModelCall } from "@/lib/ai/router";
import { validateRouterOutput } from "@/lib/ai/schemas";
import { keywordRoute } from "@/lib/ai/keyword-router";

const valid = {
  specialty: "LOR",
  confidence: "high",
  reason_short: "Tomoq va yutish bilan bog'liq belgilar LOR mutaxassisiga mos.",
  urgency: "routine",
  follow_up_questions: ["Qachondan beri?"],
};

describe("AI schema validation and fallback", () => {
  it("accepts valid structured output", async () => {
    const call = vi.fn<RouterModelCall>().mockResolvedValue(valid);
    const r = await routeSymptoms("Tomog'im og'riyapti", "uz", { callModel: call, useCache: false });
    expect(r.source).toBe("ai");
    expect(r.attempts).toBe(1);
    expect(r.result.specialty).toBe("LOR");
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("retries once when output fails validation, then uses the second valid answer", async () => {
    const call = vi
      .fn<RouterModelCall>()
      .mockResolvedValueOnce({ ...valid, specialty: "Cardiology" }) // not in the fixed list
      .mockResolvedValueOnce(valid);
    const r = await routeSymptoms("Tomog'im og'riyapti", "uz", { callModel: call, useCache: false });
    expect(call).toHaveBeenCalledTimes(2);
    expect(r.source).toBe("ai");
    expect(r.attempts).toBe(2);
  });

  it("falls back to the keyword router after two invalid outputs", async () => {
    const call = vi
      .fn<RouterModelCall>()
      .mockResolvedValueOnce("not json at all")
      .mockResolvedValueOnce({ specialty: "LOR" }); // missing fields
    const r = await routeSymptoms("Ovqatdan keyin oshqozonim og'riydi", "uz", { callModel: call, useCache: false });
    expect(call).toHaveBeenCalledTimes(2);
    expect(r.source).toBe("fallback");
    expect(r.result.specialty).toBe("Gastroenterolog");
  });

  it("treats a thrown parse error like an invalid attempt (retry, then fallback)", async () => {
    const call = vi.fn<RouterModelCall>().mockRejectedValue(new SyntaxError("Unexpected token"));
    const r = await routeSymptoms("Teri toshmasi va qichishish", "ru", { callModel: call, useCache: false });
    expect(call).toHaveBeenCalledTimes(2);
    expect(r.source).toBe("fallback");
    expect(r.result.specialty).toBe("Dermatolog");
  });

  it("goes straight to fallback on transport errors (no retry storm)", async () => {
    const call = vi.fn<RouterModelCall>().mockRejectedValue(new Anthropic.APIConnectionTimeoutError());
    const r = await routeSymptoms("Ko'zim qizarib ketdi", "en", { callModel: call, useCache: false });
    expect(call).toHaveBeenCalledTimes(1);
    expect(r.source).toBe("fallback");
    expect(r.result.specialty).toBe("Oftalmolog");
    // The patient wrote in Uzbek, so the answer is in Uzbek even though the interface is English.
    expect(r.lang).toEqual({ locale: "uz", script: "latin" });
    expect(r.result.reason_short).toMatch(/oftalmolog/);
  });

  it("never calls the model for red-flag symptoms (deterministic rule first)", async () => {
    const call = vi.fn<RouterModelCall>().mockResolvedValue(valid);
    const r = await routeSymptoms("Chest pain and shortness of breath", "en", { callModel: call, useCache: false });
    expect(call).not.toHaveBeenCalled();
    expect(r.emergency.isEmergency).toBe(true);
    expect(r.source).toBe("rules");
    expect(r.result.urgency).toBe("emergency");
  });

  it("lets the model escalate urgency to emergency", async () => {
    const call = vi.fn<RouterModelCall>().mockResolvedValue({ ...valid, urgency: "emergency" });
    const r = await routeSymptoms("Juda yomon his qilyapman", "uz", { callModel: call, useCache: false });
    expect(r.emergency.isEmergency).toBe(true);
  });

  it("rejects over-long or extra-large outputs", () => {
    expect(validateRouterOutput({ ...valid, reason_short: "x".repeat(400) })).toBeNull();
    expect(validateRouterOutput({ ...valid, follow_up_questions: ["a", "b", "c", "d"] })).toBeNull();
    expect(validateRouterOutput({ ...valid, confidence: "very high" })).toBeNull();
    expect(validateRouterOutput(JSON.stringify(valid))).not.toBeNull();
  });

  it("keyword router covers children and defaults to Terapevt", () => {
    expect(keywordRoute("Bolamning qulog'i og'riyapti", "uz").specialty).toBe("Pediatr");
    expect(keywordRoute("У ребёнка температура", "ru").specialty).toBe("Pediatr");
    expect(keywordRoute("asdfgh", "en")).toMatchObject({ specialty: "Terapevt", confidence: "low" });
    expect(keywordRoute("Болит горло и насморк", "ru").specialty).toBe("LOR");
    expect(keywordRoute("I fell and my wrist may be broken", "en").specialty).toBe("Travmatolog");
  });
});
