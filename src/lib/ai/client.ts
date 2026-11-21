import Anthropic from "@anthropic-ai/sdk";
import { GeminiError, GeminiTimeoutError } from "./gemini";

let client: Anthropic | null = null;

export type AiProvider = "anthropic" | "gemini";

/**
 * Which model provider answers. AI_PROVIDER wins; without it, Anthropic is used when its key
 * is set, otherwise Gemini when GEMINI_API_KEY is set.
 */
export function aiProvider(): AiProvider {
  const set = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (set === "gemini" || set === "anthropic") return set;
  if (!process.env.ANTHROPIC_API_KEY && process.env.GEMINI_API_KEY) return "gemini";
  return "anthropic";
}

export function aiModel(): string {
  if (aiProvider() === "gemini") return process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-lite-latest";
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-5-5";
}

/** Claude reasoning depth. "low" is fast and enough for triage/explanations; ANTHROPIC_EFFORT overrides. */
export function aiEffort(): "low" | "medium" | "high" {
  const e = process.env.ANTHROPIC_EFFORT?.trim().toLowerCase();
  return e === "medium" || e === "high" ? e : "low";
}

export function aiConfigured(): boolean {
  return Boolean(aiProvider() === "gemini" ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY);
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
    err instanceof GeminiError ||
    err instanceof GeminiTimeoutError ||
    (err instanceof Error && err.name === "AbortError")
  );
}
