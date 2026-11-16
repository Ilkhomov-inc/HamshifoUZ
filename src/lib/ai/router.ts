import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { aiConfigured, aiMock, aiModel, getAnthropic, isTransportError } from "./client";
import { detectEmergency, type EmergencyResult } from "./emergency";
import { keywordRoute } from "./keyword-router";
import { detectLanguage, type ReplyLanguage } from "./language";
import { ROUTER_SYSTEM, routerUserMessage, type Clarification } from "./prompts";
import { RouterApiSchema, validateRouterOutput, type RouterOutput } from "./schemas";
import { TtlCache } from "./cache";
import { sha256 } from "../security";
import type { Locale } from "../time";

export type RouteSource = "ai" | "fallback" | "rules" | "cache";

export type RouteResult = {
  emergency: EmergencyResult;
  result: RouterOutput;
  source: RouteSource;
  attempts: number;
  /** Language and script the answer is written in (the one the patient used). */
  lang: ReplyLanguage;
};

/** Model call returning the raw (unvalidated) structured output. Injectable for tests. */
export type RouterModelCall = (input: {
  text: string;
  locale: Locale;
  lang: ReplyLanguage;
  clarifications: Clarification[];
  signal?: AbortSignal;
}) => Promise<unknown>;

export const callRouterModel: RouterModelCall = async ({ text, lang, clarifications, signal }) => {
  const response = await getAnthropic().messages.parse(
    {
      model: aiModel(),
      max_tokens: 1024,
      system: [{ type: "text", text: ROUTER_SYSTEM, cache_control: { type: "ephemeral" } }],
      output_config: { format: zodOutputFormat(RouterApiSchema), effort: "low" },
      messages: [{ role: "user", content: routerUserMessage(text, lang, clarifications) }],
    },
    { signal, timeout: 15_000, maxRetries: 0 },
  );
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
  if (response.parsed_output) return response.parsed_output;
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : null;
};

const cache = new TtlCache<RouterOutput>(10 * 60_000, 300);

export async function routeSymptoms(
  text: string,
  locale: Locale,
  opts: {
    callModel?: RouterModelCall;
    signal?: AbortSignal;
    useCache?: boolean;
    forceModel?: boolean;
    skipModel?: boolean;
    /** Answers to Hamdard's clarifying question (second round). */
    clarifications?: Clarification[];
  } = {},
): Promise<RouteResult> {
  const clarifications = opts.clarifications ?? [];
  const answered = clarifications.length > 0;
  // Everything the patient has said so far. Rules always see the answers too.
  const said = answered ? `${text}. ${clarifications.map((c) => c.a).join(". ")}` : text;
  const lang = detectLanguage(text, locale);

  // 1. Deterministic emergency rule — before and independent of the model.
  const emergency = detectEmergency(said);
  if (emergency.isEmergency) {
    const result = keywordRoute(said, lang.locale, { emergency: true, script: lang.script });
    return { emergency, result, source: "rules", attempts: 0, lang };
  }

  const key = sha256(`route|${lang.locale}|${lang.script}|${said.trim().toLowerCase()}|${clarifications.length}`);
  if (opts.useCache !== false) {
    const hit = cache.get(key);
    if (hit) return { emergency, result: hit, source: "cache", attempts: 0, lang };
  }

  const callModel = opts.callModel ?? callRouterModel;
  const modelAvailable = !opts.skipModel && (opts.forceModel || opts.callModel || (aiConfigured() && !aiMock()));

  let result: RouterOutput | null = null;
  let attempts = 0;
  if (modelAvailable) {
    // 2. Up to two attempts: retry once on invalid output; transport errors go straight to fallback.
    for (attempts = 1; attempts <= 2; attempts++) {
      try {
        result = validateRouterOutput(await callModel({ text, locale, lang, clarifications, signal: opts.signal }));
        if (result) break;
      } catch (err) {
        if (isTransportError(err)) break;
        // parse/validation error thrown by the SDK → counts as an invalid attempt
      }
    }
    attempts = Math.min(attempts, 2);
  }

  if (!result) {
    // 3. Keyword fallback keeps the flow working.
    const fallback = keywordRoute(said, lang.locale, { script: lang.script, noClarify: answered });
    return { emergency, result: fallback, source: "fallback", attempts, lang };
  }

  // One clarifying question at most: never ask again once the patient has answered.
  if (answered) {
    result.clarifying_question = "";
    result.quick_replies = [];
  }
  // The model may escalate urgency, never de-escalate the deterministic rule.
  const finalEmergency: EmergencyResult =
    result.urgency === "emergency" ? { isEmergency: true, categories: emergency.categories } : emergency;
  if (finalEmergency.isEmergency) {
    result.clarifying_question = "";
    result.quick_replies = [];
  }
  if (opts.useCache !== false) cache.set(key, result);
  return { emergency: finalEmergency, result, source: "ai", attempts, lang };
}
