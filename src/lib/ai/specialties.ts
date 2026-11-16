export const SPECIALTIES = [
  "Terapevt",
  "Nevrolog",
  "Kardiolog",
  "LOR",
  "Pediatr",
  "Oftalmolog",
  "Dermatolog",
  "Ginekolog",
  "Travmatolog",
  "Gastroenterolog",
  "Endokrinolog",
  "Urolog",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export function isSpecialty(v: unknown): v is Specialty {
  return typeof v === "string" && (SPECIALTIES as readonly string[]).includes(v);
}

/** Short scope description given to the model (English, stable → cacheable prompt). */
export const SPECIALTY_SCOPE: Record<Specialty, string> = {
  Terapevt: "general practitioner: fever, cold, cough, weakness, blood-pressure checks, vague or multiple complaints, unsure where to go",
  Nevrolog: "headache, dizziness, numbness, tingling, back or neck pain spreading to limbs, sleep problems, tremor",
  Kardiolog: "heart: chest discomfort on exertion, palpitations, known high blood pressure, leg swelling with breathlessness",
  LOR: "ear, nose, throat: sore throat, ear pain, hearing loss, blocked nose, sinus pressure, nosebleeds",
  Pediatr: "any complaint of a child or teenager under 18",
  Oftalmolog: "eyes: vision changes, red or painful eye, itching or watering eyes",
  Dermatolog: "skin, hair, nails: rash, itching, acne, moles, hair loss",
  Ginekolog: "women's reproductive health, menstrual problems, pregnancy follow-up",
  Travmatolog: "injuries: falls, sprains, possible fractures, joint pain after an injury",
  Gastroenterolog: "digestion: stomach pain, heartburn, nausea, diarrhoea, constipation, bloating",
  Endokrinolog: "hormones: thyroid, blood sugar concerns, unexplained weight change, constant thirst",
  Urolog: "urination problems, kidney-area pain, men's urinary and reproductive health",
};
