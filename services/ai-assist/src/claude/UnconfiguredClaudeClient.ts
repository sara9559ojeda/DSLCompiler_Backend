import type { IClaudeClient } from "./IClaudeClient.js";
import { PublicServiceError } from "../errors/PublicServiceError.js";

export const ASSISTANT_NOT_CONFIGURED_MESSAGE = "El asistente de IA no está configurado en este servidor.";

/**
 * Null Object used when no API key is configured: every call fails fast with
 * a clear 503 instead of reaching the Anthropic SDK and surfacing as an
 * opaque 500. Keeps the services unaware of configuration (Liskov: it is a
 * drop-in IClaudeClient).
 */
export class UnconfiguredClaudeClient implements IClaudeClient {
  async complete(): Promise<string> {
    throw new PublicServiceError(ASSISTANT_NOT_CONFIGURED_MESSAGE, 503);
  }
}
