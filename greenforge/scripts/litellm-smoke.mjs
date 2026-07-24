#!/usr/bin/env node

/**
 * Real litellm smoke test helper for Phase 23.
 *
 * It is intentionally outside the Vitest suite: this script touches the real
 * network and should be run manually only when local litellm instances are up.
 *
 * Defaults:
 *   large pool: http://localhost:4000, model greenforge-large
 *   small pool: http://localhost:4001, model greenforge-small-fast
 */

import { LLMProviderFactory } from '../dist/infrastructure/llm/LLMProviderFactory.js';
import { FetchLLMTransport } from '../dist/infrastructure/llm/FetchLLMTransport.js';

const largeUrl = process.env.GREENFORGE_LITELLM_LARGE_URL ?? 'http://localhost:4000';
const smallUrl = process.env.GREENFORGE_LITELLM_SMALL_URL ?? 'http://localhost:4001';
const largeModel = process.env.GREENFORGE_LITELLM_LARGE_MODEL ?? 'greenforge-large';
const smallModel = process.env.GREENFORGE_LITELLM_SMALL_MODEL ?? 'greenforge-small-fast';
const apiKeyEnv = process.env.GREENFORGE_LITELLM_API_KEY_ENV || undefined;
const timeoutMs = Number(process.env.GREENFORGE_LITELLM_TIMEOUT_MS ?? '30000');

const factory = new LLMProviderFactory();
const transport = new FetchLLMTransport({ timeoutMs });

async function callProfile(name, config, prompt) {
  const startedAt = Date.now();
  const provider = factory.createFromConfig(config, transport);
  const response = await provider.generate(prompt);
  return {
    profile: name,
    baseUrl: config.baseUrl,
    model: config.model,
    elapsedMs: Date.now() - startedAt,
    responsePreview: response.slice(0, 500),
  };
}

try {
  const results = [];

  results.push(await callProfile('large', {
    provider: 'litellm',
    baseUrl: largeUrl,
    model: largeModel,
    greenforgeProfile: 'large',
    apiKeyEnv,
    timeout: timeoutMs,
  }, 'GreenForge smoke test: responda apenas "LARGE_OK".'));

  results.push(await callProfile('small', {
    provider: 'litellm',
    baseUrl: smallUrl,
    model: smallModel,
    greenforgeProfile: 'small',
    apiKeyEnv,
    timeout: timeoutMs,
  }, 'Classifique a intenção: oi. Responda curto.'));

  console.log(JSON.stringify({ ok: true, results }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    name: error?.name,
    code: error?.code,
    provider: error?.provider,
    retryable: error?.retryable,
    message: error?.message,
  }, null, 2));
  process.exit(1);
}
