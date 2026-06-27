import { z } from 'zod';

/**
 * Supported LLM provider names.
 */
export const LLMProviderNameSchema = z.enum([
  'mock',
  'qwen',
  'openai',
  'claude',
  'gemini',
]);

export type LLMProviderName = z.infer<typeof LLMProviderNameSchema>;

/**
 * Configuration for a single LLM provider.
 */
export const LLMProviderConfigSchema = z.object({
  /** Provider name (must be one of the supported providers) */
  provider: LLMProviderNameSchema,
  /** Optional model name (e.g., 'gpt-4', 'claude-3-opus') */
  model: z.string().optional(),
  /** Optional environment variable name that holds the API key (never the key itself) */
  apiKeyEnv: z.string().optional(),
  /** Optional base URL for the provider API */
  baseUrl: z.string().url().optional().or(z.literal('')),
  /** Optional timeout in milliseconds (must be positive) */
  timeout: z.number().positive().optional(),
  /** Optional mock/test mode flag — forces mock behavior even for real providers */
  mockMode: z.boolean().optional(),
});

export type LLMProviderConfig = z.infer<typeof LLMProviderConfigSchema>;

/**
 * Internal config schema for factory options — accepts any string provider
 * to allow fallback logic to handle unknown providers gracefully.
 */
const LLMProviderConfigLooseSchema = z.object({
  provider: z.string(),
  model: z.string().optional(),
  apiKeyEnv: z.string().optional(),
  baseUrl: z.string().url().optional().or(z.literal('')),
  timeout: z.number().positive().optional(),
  mockMode: z.boolean().optional(),
});

/**
 * Options for the LLM Provider Factory.
 * Uses a loose config schema that accepts any string provider name,
 * so the factory can apply fallback logic before Zod rejects unknown names.
 */
export const LLMProviderFactoryOptionsSchema = z.object({
  /** Provider configuration (loose — any string provider accepted) */
  config: LLMProviderConfigLooseSchema,
  /** Optional fallback provider name when the requested provider is unavailable */
  fallbackProvider: LLMProviderNameSchema.optional(),
  /** Whether to use fallback on unknown provider (default: true) */
  fallbackOnUnknown: z.boolean().optional().default(true),
});

export type LLMProviderFactoryOptions = z.infer<typeof LLMProviderFactoryOptionsSchema>;

/**
 * Transport interface for making HTTP requests.
 * Used to decouple real providers from network calls.
 * In production, a real transport would be injected.
 * In tests, a mock transport is used.
 */
export interface LLMTransport {
  post(url: string, headers: Record<string, string>, body: string): Promise<{ status: number; body: string }>;
}

/**
 * Error thrown when a real provider is used without proper configuration.
 */
export class LLMProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly provider: LLMProviderName,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'LLMProviderError';
  }
}