import type Anthropic from "@anthropic-ai/sdk";
import { aiConfigured, aiMock, aiEffort, aiModel, aiProvider, getAnthropic } from "./client";
import { geminiStream, type GeminiFinal, type GeminiPart } from "./gemini";
import { MarkerFilter } from "./marker";
import { EXPLAINER_SYSTEM, explainerUserText, type Clarification } from "./prompts";
import { detectLanguage, type ReplyLanguage } from "./language";
import { basicExplanation, parseSchedule, type ScheduleItem } from "./schedule";
import { detectSeriousQuestion, type SeriousTopic } from "./serious";
import { detectEmergency } from "./emergency";
import { TtlCache } from "./cache";
import { sha256, logEvent } from "../security";
import type { Locale } from "../time";

export type ExplainInput = {
  locale: Locale;
  prescription?: string;
  image?: { mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };
  question?: string;
  /** The last few exchanges of this chat, so a short follow-up keeps its context. */
  history?: Clarification[];
};

/** Events streamed to the browser as NDJSON lines. */
export type ExplainEvent =
  | { t: "d"; v: string }
  | { t: "plan"; items: ScheduleItem[]; followUpDays: number | null }
  | { t: "meta"; needsDoctor: boolean; topics: SeriousTopic[]; emergency: boolean }
  | { t: "error"; code: "ai_unavailable" | "ai_busy" | "refused" | "timeout" }
  | { t: "end" };

const cache = new TtlCache<{ text: string; needsDoctor: boolean }>(10 * 60_000, 200);

function buildMessages(input: ExplainInput, topics: SeriousTopic[], lang: ReplyLanguage): Anthropic.MessageParam[] {
  const text = explainerUserText({
    lang,
    prescription: input.prescription,
    hasImage: Boolean(input.image),
    question: input.question,
    history: input.history,
  });
  const content: Anthropic.ContentBlockParam[] = [];
  if (input.image) {
    content.push({ type: "image", source: { type: "base64", media_type: input.image.mediaType, data: input.image.data } });
  }
  content.push({ type: "text", text });
  const messages: Anthropic.MessageParam[] = [{ role: "user", content }];
  if (topics.length > 0) {
    // Operator channel (mid-conversation system message), never mixed with user text.
    messages.push({
      role: "system",
      content: `Server check: the patient's question touches: ${topics.join(", ")}. Do not answer the medical substance of that part. Kindly say this needs their doctor and end with the marker.`,
    });
  }
  return messages;
}

/** Same request for Gemini: the server check goes into the system instruction instead. */
function geminiRequest(input: ExplainInput, topics: SeriousTopic[], lang: ReplyLanguage): { system: string; parts: GeminiPart[] } {
  const parts: GeminiPart[] = [];
  if (input.image) parts.push({ inlineData: { mimeType: input.image.mediaType, data: input.image.data } });
  parts.push({
    text: explainerUserText({ lang, prescription: input.prescription, hasImage: Boolean(input.image), question: input.question, history: input.history }),
  });
  const system =
    topics.length > 0
      ? `${EXPLAINER_SYSTEM}\n\nServer check: the patient's question touches: ${topics.join(", ")}. Do not answer the medical substance of that part. Kindly say this needs their doctor and end with the marker.`
      : EXPLAINER_SYSTEM;
  return { system, parts };
}

/** Streams the Gemini answer through the same marker filter and returns the final status. */
async function* streamGemini(
  input: ExplainInput,
  topics: SeriousTopic[],
  lang: ReplyLanguage,
  filter: MarkerFilter,
  signal: AbortSignal | undefined,
): AsyncGenerator<string, GeminiFinal> {
  const { system, parts } = geminiRequest(input, topics, lang);
  const gen = geminiStream({ model: aiModel(), system, parts, maxOutputTokens: 1500, signal, timeoutMs: 30_000 });
  for (;;) {
    const step = await gen.next();
    if (step.done) return step.value;
    const out = filter.push(step.value);
    if (out) yield out;
  }
}

const MOCK: Record<Locale, string> = {
  uz: "Shifokoringiz yozganlari oddiy tilda:\n\nQanday ichish kerak:\n- **Paratsetamol 500 mg** — 1 tabletkadan, ovqatdan keyin, bir stakan suv bilan.\n\nQachon:\n- Kuniga **3 mahal** (ertalab, tushda, kechqurun).\n\nQancha muddat:\n- **5 kun**.\n\nQachon qayta kelish kerak:\n- **7 kundan keyin** nazorat ko'rigiga.\n\n(Bu sinov rejimidagi namunaviy javob.)",
  ru: "Назначения врача простыми словами:\n\nКак принимать:\n- **Парацетамол 500 мг** — по 1 таблетке после еды, запивая стаканом воды.\n\nКогда:\n- **3 раза в день** (утром, днём, вечером).\n\nСколько дней:\n- **5 дней**.\n\nКогда прийти снова:\n- Через **7 дней** на контрольный осмотр.\n\n(Это образец ответа в тестовом режиме.)",
  en: "Your doctor's instructions in plain words:\n\nHow to take:\n- **Paracetamol 500 mg** — 1 tablet after a meal, with a glass of water.\n\nWhen:\n- **3 times a day** (morning, afternoon, evening).\n\nFor how long:\n- **5 days**.\n\nWhen to come back:\n- In **7 days** for a check-up.\n\n(This is a sample answer in test mode.)",
};

/** Said instead of an answer when a question arrives and no model is connected. */
const OFFLINE_QUESTION: Record<Locale, string> = {
  uz: "Savollarga javob berish uchun Hamdard AI hozir ulanmagan. Yuqoridagi izohga qarang yoki shifokoringizdan so'rang.",
  ru: "Чтобы отвечать на вопросы, Hamdard AI сейчас не подключён. Посмотрите пояснение выше или спросите у врача.",
  en: "Hamdard AI is not connected right now, so it cannot answer questions. Please see the summary above or ask your doctor.",
};
const OFFLINE_DOCTOR: Record<Locale, string> = {
  uz: "Bu savolni shifokoringiz hal qilishi kerak. Iltimos, unga murojaat qiling.",
  ru: "Этот вопрос должен решить ваш врач. Пожалуйста, обратитесь к нему.",
  en: "This is a question for your doctor. Please get in touch with them.",
};

async function* chunked(text: string, delayMs: number): AsyncGenerator<string> {
  const parts = text.match(/[\s\S]{1,14}/g) ?? [];
  for (const p of parts) {
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    yield p;
  }
}

/**
 * Streams a plain-language explanation. Image bytes are used only in memory
 * for this request and are never stored or logged.
 */
export async function* explain(input: ExplainInput, signal?: AbortSignal): AsyncGenerator<ExplainEvent> {
  const topics = detectSeriousQuestion(input.question);
  const emergency = input.question ? detectEmergency(input.question).isEmergency : false;
  // Answer in the language the patient asked in; the first explanation uses the interface language.
  const lang: ReplyLanguage = input.question
    ? detectLanguage(input.question, input.locale)
    : { locale: input.locale, script: input.locale === "ru" ? "cyrillic" : "latin" };
  const imageHash = input.image ? sha256(input.image.data) : "";
  const historyKey = input.question && input.history?.length ? JSON.stringify(input.history) : "";
  const key = sha256(`explain|${lang.locale}|${lang.script}|${input.prescription ?? ""}|${imageHash}|${input.question ?? ""}|${historyKey}`);

  // The daily schedule comes straight from the doctor's typed text (no model), once per chat.
  if (!input.question && input.prescription) {
    const plan = parseSchedule(input.prescription);
    if (plan.items.length > 0 || plan.followUpDays !== null) yield { t: "plan", items: plan.items, followUpDays: plan.followUpDays };
  }

  /** Model-free reply: a basic summary of the note, or an honest "ask your doctor" for questions. */
  const offlineText = (): string | null => {
    if (input.question) return topics.length > 0 || emergency ? OFFLINE_DOCTOR[lang.locale] : OFFLINE_QUESTION[lang.locale];
    return input.prescription ? basicExplanation(input.prescription, lang) : null;
  };

  const cached = cache.get(key);
  if (cached) {
    for await (const c of chunked(cached.text, 8)) yield { t: "d", v: c };
    yield { t: "meta", needsDoctor: cached.needsDoctor || topics.length > 0 || emergency, topics, emergency };
    yield { t: "end" };
    return;
  }

  if (aiMock() || !aiConfigured()) {
    // No model: photos cannot be read at all; typed notes still get a basic explanation.
    const text = offlineText() ?? (aiMock() ? MOCK[lang.locale] : null);
    if (text === null) {
      yield { t: "error", code: "ai_unavailable" };
      return;
    }
    for await (const c of chunked(text, aiMock() ? 12 : 4)) yield { t: "d", v: c };
    yield { t: "meta", needsDoctor: Boolean(input.question) || topics.length > 0 || emergency, topics, emergency };
    yield { t: "end" };
    return;
  }

  const started = Date.now();
  const filter = new MarkerFilter();
  let full = "";
  try {
    if (aiProvider() === "gemini") {
      const gen = streamGemini(input, topics, lang, filter, signal);
      let final: GeminiFinal;
      for (;;) {
        const step = await gen.next();
        if (step.done) {
          final = step.value;
          break;
        }
        full += step.value;
        yield { t: "d", v: step.value };
      }
      const rest = filter.flush();
      if (rest) {
        full += rest;
        yield { t: "d", v: rest };
      }
      logEvent("ai.explain", {
        ms: Date.now() - started,
        model: final.model,
        stop: final.finishReason,
        in: final.inputTokens,
        out: final.outputTokens,
        image: Boolean(input.image),
      });
      if (final.blocked && !full.trim()) {
        yield { t: "error", code: "refused" };
        return;
      }
      if (final.finishReason === "MAX_TOKENS") {
        full += "…";
        yield { t: "d", v: "…" };
      }
      const needsDoctor = filter.found || topics.length > 0 || emergency;
      if (full.trim()) cache.set(key, { text: full, needsDoctor: filter.found });
      yield { t: "meta", needsDoctor, topics, emergency };
      yield { t: "end" };
      return;
    }
    const stream = getAnthropic().messages.stream(
      {
        model: aiModel(),
        max_tokens: 4096,
        system: [{ type: "text", text: EXPLAINER_SYSTEM, cache_control: { type: "ephemeral" } }],
        output_config: { effort: aiEffort() },
        messages: buildMessages(input, topics, lang),
      },
      { signal, timeout: 30_000, maxRetries: 0 },
    );
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const out = filter.push(event.delta.text);
        if (out) {
          full += out;
          yield { t: "d", v: out };
        }
      }
    }
    const final = await stream.finalMessage();
    const rest = filter.flush();
    if (rest) {
      full += rest;
      yield { t: "d", v: rest };
    }
    logEvent("ai.explain", {
      ms: Date.now() - started,
      model: final.model,
      stop: final.stop_reason ?? "",
      in: final.usage.input_tokens,
      out: final.usage.output_tokens,
      image: Boolean(input.image),
    });
    if (final.stop_reason === "refusal" && !full.trim()) {
      yield { t: "error", code: "refused" };
      return;
    }
    if (final.stop_reason === "max_tokens") {
      full += "…";
      yield { t: "d", v: "…" };
    }
    const needsDoctor = filter.found || topics.length > 0 || emergency;
    if (full.trim()) cache.set(key, { text: full, needsDoctor: filter.found });
    yield { t: "meta", needsDoctor, topics, emergency };
    yield { t: "end" };
  } catch (err) {
    const name = err instanceof Error ? err.constructor.name : "unknown";
    logEvent("ai.explain.error", { ms: Date.now() - started, error: name });
    const status = (err as { status?: number }).status;
    // Nothing shown yet and we have the typed note: fall back to the basic summary instead of an error.
    const fallback = !full && !input.question ? offlineText() : null;
    if (fallback) {
      for await (const c of chunked(fallback, 4)) yield { t: "d", v: c };
      yield { t: "meta", needsDoctor: false, topics, emergency };
      yield { t: "end" };
      return;
    }
    yield { t: "error", code: status === 429 || status === 529 ? "ai_busy" : name.includes("Timeout") ? "timeout" : "ai_unavailable" };
  }
}
