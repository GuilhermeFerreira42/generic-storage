import { LLMProviderError, LLMTransport } from './LLMProviderConfig.js';

export interface FetchLLMTransportOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Fetch-backed implementation of LLMTransport for real OpenAI-compatible calls.
 *
 * Tests inject fetchImpl, so no test touches the real network. Production may use
 * globalThis.fetch (available in the supported Node runtime).
 */
export class FetchLLMTransport implements LLMTransport {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number | null;

  constructor(options: FetchLLMTransportOptions = {}) {
    if (!options.fetchImpl && typeof globalThis.fetch !== 'function') {
      throw new LLMProviderError(
        'NO_FETCH',
        'FetchLLMTransport: global fetch is not available. Inject fetchImpl or use a Node runtime with fetch support.',
        'litellm',
        false,
      );
    }

    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = options.timeoutMs ?? null;
  }

  async post(url: string, headers: Record<string, string>, body: string): Promise<{ status: number; body: string }> {
    const controller = new AbortController();
    const timeout = this.timeoutMs
      ? setTimeout(() => controller.abort(), this.timeoutMs)
      : null;

    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      return {
        status: response.status,
        body: await response.text(),
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new LLMProviderError(
          'TRANSPORT_TIMEOUT',
          `FetchLLMTransport: request timed out after ${this.timeoutMs}ms.`,
          'litellm',
          true,
        );
      }

      throw new LLMProviderError(
        'TRANSPORT_ERROR',
        'FetchLLMTransport: request failed before a response was received.',
        'litellm',
        true,
      );
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
