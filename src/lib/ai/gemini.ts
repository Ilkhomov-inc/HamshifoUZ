/**
 * Minimal Google Gemini adapter (REST, no SDK). Used when AI_PROVIDER=gemini.
 * Server-only: the key is sent in a header and never reaches the browser.
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "GeminiError";
  }
}
export class GeminiTimeoutError extends Error {
  constructor() {
    super("Gemini request timed out");
    this.name = "GeminiTimeoutError";
  }
}

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

type Usage = { promptTokenCount?: number; candidatesTokenCount?: number };
type Chunk = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: Usage;
  modelVersion?: string;
};

export type GeminiFinal = { finishReason: string; blocked: boolean; inputTokens: number; outputTokens: number; model: string };

/** Keep answers fast: no long "thinking" for these short tasks. */
function thinkingConfig(model: string): Record<string, unknown> | undefined {
  if (model.startsWith("gemini-2.5")) return model.includes("pro") ? { thinkingBudget: 128 } : { thinkingBudget: 0 };
  if (model.startsWith("gemini-3")) return { thinkingLevel: "low" };
  return undefined;
}

/** Statuses where another model may still answer: overloaded, rate-limited, or retired for this key. */
const FAILOVER = new Set([404, 429, 500, 503]);

/**
 * `model` may be a comma-separated list (GEMINI_MODEL="a,b,c"): free-tier models are often
 * overloaded, so on a failover status the next model is tried within the same time budget.
 */
async function post(
  modelList: string,
  method: string,
  body: (model: string) => unknown,
  signal: AbortSignal | undefined,
  timeoutMs: number,
) {
  const models = modelList.split(",").map((m) => m.trim()).filter(Boolean);
  const timeout = AbortSignal.timeout(timeoutMs);
  let lastErr: unknown = new GeminiError("no Gemini model configured");
  for (const model of models) {
    try {
      return { ...(await postOne(model, method, body(model), signal, timeout)), model };
    } catch (err) {
      lastErr = err;
      if (!(err instanceof GeminiError && err.status !== undefined && FAILOVER.has(err.status))) throw err;
    }
  }
  throw lastErr;
}

async function postOne(model: string, method: string, body: unknown, signal: AbortSignal | undefined, timeout: AbortSignal) {
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let res: Response;
  try {
    res = await fetch(`${BASE}/${encodeURIComponent(model)}:${method}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      body: JSON.stringify(body),
      signal: combined,
    });
  } catch (err) {
    if (timeout.aborted) throw new GeminiTimeoutError();
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new GeminiError(err instanceof Error ? err.message : "network error");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GeminiError(`Gemini HTTP ${res.status}: ${detail.slice(0, 200)}`, res.status);
  }
  return { res, timeout };
}

function textOf(chunk: Chunk): string {
  return (chunk.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

/** One JSON answer shaped by `schema` (JSON Schema). Returns the raw JSON text, or null if blocked/cut off. */
export async function geminiJson(opts: {
  model: string;
  system: string;
  user: string;
  schema: Record<string, unknown>;
  signal?: AbortSignal;
  timeoutMs: number;
}): Promise<string | null> {
  const { res } = await post(
    opts.model,
    "generateContent",
    (model) => ({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: [{ text: opts.user }] }],
      generationConfig: {
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseJsonSchema: opts.schema,
        thinkingConfig: thinkingConfig(model),
      },
    }),
    opts.signal,
    opts.timeoutMs,
  );
  const data = (await res.json()) as Chunk;
  const reason = data.candidates?.[0]?.finishReason;
  if (data.promptFeedback?.blockReason || reason === "SAFETY" || reason === "MAX_TOKENS") return null;
  return textOf(data) || null;
}

/** Streams text deltas; the generator's return value carries the final status and token usage. */
export async function* geminiStream(opts: {
  model: string;
  system: string;
  parts: GeminiPart[];
  maxOutputTokens: number;
  signal?: AbortSignal;
  timeoutMs: number;
}): AsyncGenerator<string, GeminiFinal> {
  const { res, timeout, model } = await post(
    opts.model,
    "streamGenerateContent?alt=sse",
    (m) => ({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: opts.parts }],
      generationConfig: { maxOutputTokens: opts.maxOutputTokens, thinkingConfig: thinkingConfig(m) },
    }),
    opts.signal,
    opts.timeoutMs,
  );
  const final: GeminiFinal = { finishReason: "", blocked: false, inputTokens: 0, outputTokens: 0, model };
  if (!res.body) return final;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        let chunk: Chunk;
        try {
          chunk = JSON.parse(line.slice(5)) as Chunk;
        } catch {
          continue;
        }
        if (chunk.promptFeedback?.blockReason) final.blocked = true;
        const reason = chunk.candidates?.[0]?.finishReason;
        if (reason) final.finishReason = reason;
        if (chunk.usageMetadata) {
          final.inputTokens = chunk.usageMetadata.promptTokenCount ?? final.inputTokens;
          final.outputTokens = chunk.usageMetadata.candidatesTokenCount ?? final.outputTokens;
        }
        if (chunk.modelVersion) final.model = chunk.modelVersion;
        const t = textOf(chunk);
        if (t) yield t;
      }
    }
  } catch (err) {
    if (timeout.aborted) throw new GeminiTimeoutError();
    throw err;
  }
  if (final.finishReason === "SAFETY" || final.finishReason === "PROHIBITED_CONTENT") final.blocked = true;
  return final;
}
