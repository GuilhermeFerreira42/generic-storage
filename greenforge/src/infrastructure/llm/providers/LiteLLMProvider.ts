import { z } from 'zod';
import { LLMProvider } from '../../../core/ports/LLMProvider.js';
import { LLMProviderConfig, LLMTransport, LLMProviderError } from '../LLMProviderConfig.js';
import { MockLLMProvider } from './MockLLMProvider.js';

const LiteLLMMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1),
});

export const LiteLLMRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(LiteLLMMessageSchema).min(2),
  temperature: z.number().min(0).max(2),
});

const LiteLLMResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string(),
    }),
  })).min(1),
  dropped_params: z.array(z.string()).optional(),
}).passthrough();

export interface LiteLLMAuditSink {
  recordAuditWarning(source: string, message: string, metadata: Record<string, unknown>): void;
}

/**
 * LiteLLMProvider — OpenAI-compatible transport adapter for litellm.
 *
 * litellm is treated only as a transport pipe: GreenForge owns request shape,
 * validation and visibility of dropped parameters.
 */
export class LiteLLMProvider implements LLMProvider {
  private readonly config: LLMProviderConfig;
  private readonly transport: LLMTransport | null;
  private readonly auditSink: LiteLLMAuditSink | null;
  private readonly mockProvider = new MockLLMProvider();

  constructor(config: LLMProviderConfig, transport?: LLMTransport, auditSink?: LiteLLMAuditSink) {
    this.config = config;
    this.transport = transport ?? null;
    this.auditSink = auditSink ?? null;
  }

  async generate(prompt: string): Promise<string> {
    if (this.config.mockMode) {
      return this.mockProvider.generate(prompt);
    }

    if (!this.transport) {
      throw new LLMProviderError(
        'NO_TRANSPORT',
        'LiteLLMProvider: No transport configured. Cannot call litellm without an injected transport.',
        'litellm',
        false,
      );
    }

    const baseUrl = this.getBaseUrl();
    const model = this.config.model ?? 'greenforge-default';
    const body = LiteLLMRequestSchema.parse({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are GreenForge, an autonomous software orchestration assistant. Preserve all task context and return only the requested content.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    });

    const headers = this.buildHeaders();
    const response = await this.transport.post(
      `${baseUrl}/chat/completions`,
      headers,
      JSON.stringify(body),
    );

    if (response.status !== 200) {
      throw new LLMProviderError(
        'API_ERROR',
        `LiteLLMProvider: API returned status ${response.status}`,
        'litellm',
        response.status === 429 || response.status >= 500,
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(response.body);
    } catch {
      throw new LLMProviderError(
        'INVALID_RESPONSE',
        'LiteLLMProvider: API returned non-JSON response body.',
        'litellm',
        false,
      );
    }

    const parsed = LiteLLMResponseSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new LLMProviderError(
        'INVALID_RESPONSE',
        'LiteLLMProvider: API response does not match OpenAI-compatible chat completion schema.',
        'litellm',
        false,
      );
    }

    this.auditDroppedParams(parsed.data.dropped_params);
    return parsed.data.choices[0].message.content;
  }

  private getBaseUrl(): string {
    const configWithAlias = this.config as LLMProviderConfig & { base_url?: string };
    const rawBaseUrl = this.config.baseUrl || configWithAlias.base_url;
    if (!rawBaseUrl) {
      throw new LLMProviderError(
        'NO_BASE_URL',
        'LiteLLMProvider: No baseUrl/base_url configured for litellm endpoint.',
        'litellm',
        false,
      );
    }
    return rawBaseUrl.replace(/\/+$/, '');
  }

  private buildHeaders(): Record<string, string> {
    const configWithProfile = this.config as LLMProviderConfig & { greenforgeProfile?: 'small' | 'large' };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-greenforge-profile': configWithProfile.greenforgeProfile ?? 'large',
    };

    if (this.config.apiKeyEnv) {
      const apiKey = process.env[this.config.apiKeyEnv];
      if (!apiKey) {
        throw new LLMProviderError(
          'NO_API_KEY',
          `LiteLLMProvider: Environment variable ${this.config.apiKeyEnv} is not set.`,
          'litellm',
          false,
        );
      }
      headers.Authorization = `Bearer ${apiKey}`;
    }

    return headers;
  }

  private auditDroppedParams(droppedParams?: string[]): void {
    if (!droppedParams || droppedParams.length === 0) return;

    this.auditSink?.recordAuditWarning(
      'LiteLLMProvider',
      `DROP DETECTED: litellm reported dropped params: ${droppedParams.join(', ')}`,
      { droppedParams },
    );
  }
}
