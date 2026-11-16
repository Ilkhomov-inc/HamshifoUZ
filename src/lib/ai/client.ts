import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function aiModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-5-5";
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Canned responses for local UI work. Never active in production builds. */
export function aiMock(): boolean {
  return process.env.AI_MOCK === "1" && process.env.NODE_ENV !== "production";
}

/** Server-only Anthropic client. The key never leaves the server. */
export function getAnthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 25_000 });
  }
  return client;
}

/** True for transport/API failures (timeouts, 4xx/5xx, network) as opposed to bad model output. */
export function isTransportError(err: unknown): boolean {
  return (
    err instanceof Anthropic.APIError ||
    err instanceof Anthropic.APIConnectionError ||
    (err instanceof Error && err.name === "AbortError")
  );
}
