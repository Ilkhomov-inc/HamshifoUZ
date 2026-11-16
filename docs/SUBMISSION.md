# Submission note (paste-ready)

**Hamshifo UZ — sog'liq sari yo'lda yo'ldoshingiz**

An electronic queue and appointment-slot system for Fergana-region polyclinics, with Hamdard AI (Claude Haiku 5.5) removing the two causes of avoidable extra queues: patients queuing for the wrong doctor, and patients returning only because they didn't understand a prescription.

**Try it:** open the link → *Kirish* → **Demo bemor** (patient) or **Demo shifokor** (doctor). No install needed. The full 3-minute route is on the *Demo haqida / About this demo* page.

**What works (end to end):**
- Symptoms → Hamdard AI suggests one of 12 specialties (structured JSON, schema-validated, retry + keyword fallback) → choose clinic/doctor → calendar → time slot → name + phone + consent → confirmation.
- A deterministic emergency rule (uz/ru/en) shows a red "call 103" banner before and independently of the AI.
- Taken slots disappear and can never be double-booked (database UNIQUE constraint + atomic booking function; tested with 30 concurrent requests).
- My appointments (cancel, details); doctor dashboard (day/week, patient symptoms + AI suggestion, written recommendations).
- After the visit, Hamdard AI explains the doctor's instructions in plain language (streamed, follow-up questions); serious questions are routed back to the doctor with "Find a follow-up slot" and "Doctor's contact". The prescription explainer also accepts pasted text or a photo.
- Uzbek (default), Russian, English; the AI replies in the user's language.
- Google sign-in, plus one-click low-privilege demo accounts.
- Security: Row Level Security on every table, roles assigned only by an admin, httpOnly SameSite cookies, CSRF Origin checks, rate limits, strict CSP and security headers. The AI receives no names or phones, and photos are never stored.

**What is simulated:** 3 clinics (Fergana, Margilan, Kokand), 14 doctors, 14 days of slots, patients and prescriptions are all fictional demo data. Pharmacy (Dorixona) and the mobile app are "Coming soon" only. There are no real clinic integrations, SMS or payments.

**AI tools used:** Inside the product, Anthropic **Claude Haiku 5.5** (Hamdard AI), called only from the server. For development, **Claude** (Anthropic) was used as a coding assistant for code, design and tests.

**Disclaimer:** Hamdard AI never diagnoses or prescribes; it only suggests which specialist to see and explains what the doctor wrote.
