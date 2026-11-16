import { describe, expect, it } from "vitest";
import { detectEmergency } from "@/lib/ai/emergency";

describe("deterministic emergency rule (uz / ru / en)", () => {
  const positives: Array<[string, string]> = [
    ["Ko'kragim qattiq og'riyapti va nafas qisyapti", "chest_pain_breathing"],
    ["Koʻkragimda siqilish bor, nafasim yetmayapti", "chest_pain_breathing"],
    ["Кўкрагим оғрияпти, нафас қисяпти", "chest_pain_breathing"],
    ["Сильная боль в груди и одышка", "chest_pain_breathing"],
    ["Давит в груди, не хватает воздуха", "chest_pain_breathing"],
    ["Chest pain and shortness of breath since an hour", "chest_pain_breathing"],
    ["Chest pain spreading to my left arm", "chest_pain_breathing"],
    ["I can't breathe", "breathing"],
    ["Bolam nafas ololmayapti", "breathing"],
    ["Не могу дышать", "breathing"],
    ["Otamning yuzi qiyshayib qoldi, gapira olmayapti", "stroke"],
    ["Перекосило лицо и нарушилась речь", "stroke"],
    ["Sudden weakness on one side of my body and slurred speech", "stroke"],
    ["Qon to'xtamayapti, kuchli qon ketyapti", "bleeding"],
    ["Сильное кровотечение из раны", "bleeding"],
    ["Bleeding heavily from a cut, won't stop", "bleeding"],
    ["Onam hushini yo'qotdi", "unconscious"],
    ["Он потерял сознание", "unconscious"],
    ["My father passed out and is unresponsive", "unconscious"],
    ["Asal arisi chaqdi, tomog'im shishib ketyapti", "anaphylaxis"],
    ["Отек горла после лекарства", "anaphylaxis"],
    ["Severe allergic reaction, tongue swelling", "anaphylaxis"],
    ["Bolada tutqanoq boshlandi", "seizure"],
    ["Судороги у ребёнка", "seizure"],
    ["I want to end my life", "self_harm"],
    ["Homiladorman, qon kelyapti", "pregnancy_bleeding"],
    ["Overdose of sleeping pills", "poisoning"],
  ];

  it.each(positives)("flags %s", (text, category) => {
    const r = detectEmergency(text);
    expect(r.isEmergency).toBe(true);
    expect(r.categories).toContain(category);
  });

  const negatives = [
    "Ikki kundan beri tomog'im og'riyapti",
    "Tez-tez bosh og'rig'i, ayniqsa kechqurun",
    "Teri toshmasi va qichishish",
    "Ovqatdan keyin oshqozonim og'riydi",
    "Болит горло и насморк",
    "Немного кашляю по утрам",
    "My knee hurts after running",
    "I have a mild cough and runny nose",
    "",
  ];

  it.each(negatives)("does not flag routine complaint: %s", (text) => {
    expect(detectEmergency(text).isEmergency).toBe(false);
  });

  it("does not trigger on chest pain alone without breathing problems (routed, not 103)", () => {
    expect(detectEmergency("ko'kragim biroz og'riyapti").isEmergency).toBe(false);
  });
});
