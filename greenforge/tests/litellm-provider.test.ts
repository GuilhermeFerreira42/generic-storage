import { afterEach, describe, expect, it } from 'vitest';
import { LiteLLMProvider } from '../src/infrastructure/llm/providers/LiteLLMProvider.js';
import { LLMProviderFactory } from '../src/infrastructure/llm/LLMProviderFactory.js';
import { LLMProviderRegistry } from '../src/infrastructure/llm/LLMProviderRegistry.js';
import {
  LLMProviderConfigSchema,
  LLMProviderError,
  LLMProviderNameSchema,
  LLMTransport,
} from '../src/infrastructure/llm/LLMProviderConfig.js';

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  delete process.env.LITELLM_TEST_KEY;
});

describe('Fase 23 — LiteLLMProvider', () => {
  it('accepts litellm in provider schema and config schema', () => {
    expect(LLMProviderNameSchema.safeParse('litellm').success).toBe(true);

    const result = LLMProviderConfigSchema.safeParse({
      provider: 'litellm',
      baseUrl: 'http://localhost:4000',
      model: 'greenforge-large',
      greenforgeProfile: 'large',
      timeout: 1200,
    });

    expect(result.success).toBe(true);
  });

  it('accepts base_url alias for litellm endpoint compatibility', () => {
    const result = LLMProviderConfigSchema.safeParse({
      provider: 'litellm',
      base_url: 'http://localhost:4001',
      model: 'greenforge-small',
      greenforgeProfile: 'small',
    });

    expect(result.success).toBe(true);
  });

  it('registers litellm as a built-in provider', () => {
    const registry = new LLMProviderRegistry();

    expect(registry.has('litellm')).toBe(true);
    expect(registry.getRegisteredNames()).toContain('litellm');
    expect(registry.create({ provider: 'litellm', mockMode: true })).toBeInstanceOf(LiteLLMProvider);
  });

  it('posts an OpenAI-compatible chat completion payload through the injected transport', async () => {
    let captured: { url: string; headers: Record<string, string>; body: string } | null = null;
    const transport: LLMTransport = {
      post: async (url, headers, body) => {
        captured = { url, headers, body };
        return {
          status: 200,
          body: JSON.stringify({ choices: [{ message: { content: 'real response' } }] }),
        };
      },
    };

    const provider = new LiteLLMProvider(
      {
        provider: 'litellm',
        baseUrl: 'http://localhost:4000/',
        model: 'greenforge-large',
        greenforgeProfile: 'large',
      },
      transport,
    );

    await expect(provider.generate('Implement login')).resolves.toBe('real response');

    expect(captured).not.toBeNull();
    expect(captured?.url).toBe('http://localhost:4000/chat/completions');
    expect(captured?.headers['Content-Type']).toBe('application/json');
    expect(captured?.headers['x-greenforge-profile']).toBe('large');
    expect(captured?.headers.Authorization).toBeUndefined();

    const parsedBody = JSON.parse(captured?.body ?? '{}');
    expect(parsedBody.model).toBe('greenforge-large');
    expect(parsedBody.temperature).toBeTypeOf('number');
    expect(parsedBody.messages).toEqual([
      expect.objectContaining({ role: 'system', content: expect.stringContaining('GreenForge') }),
      { role: 'user', content: 'Implement login' },
    ]);
  });

  it('uses the small routing profile header for the fast QwenRouter pool on port 4001', async () => {
    let capturedHeaders: Record<string, string> = {};
    let capturedUrl = '';
    const transport: LLMTransport = {
      post: async (url, headers) => {
        capturedUrl = url;
        capturedHeaders = headers;
        return {
          status: 200,
          body: JSON.stringify({ choices: [{ message: { content: '{"intention":"NORMAL_CHAT"}' } }] }),
        };
      },
    };

    const provider = new LiteLLMProvider(
      {
        provider: 'litellm',
        base_url: 'http://localhost:4001',
        model: 'greenforge-small-fast',
        greenforgeProfile: 'small',
      },
      transport,
    );

    await provider.generate('Classifique a intenção: oi');

    expect(capturedUrl).toBe('http://localhost:4001/chat/completions');
    expect(capturedHeaders['x-greenforge-profile']).toBe('small');
  });

  it('adds Authorization only when apiKeyEnv is configured and present', async () => {
    process.env.LITELLM_TEST_KEY = 'test-secret';
    let capturedHeaders: Record<string, string> = {};
    const transport: LLMTransport = {
      post: async (_url, headers) => {
        capturedHeaders = headers;
        return {
          status: 200,
          body: JSON.stringify({ choices: [{ message: { content: 'authorized' } }] }),
        };
      },
    };

    const provider = new LiteLLMProvider(
      {
        provider: 'litellm',
        baseUrl: 'http://localhost:4000',
        model: 'greenforge-large',
        apiKeyEnv: 'LITELLM_TEST_KEY',
      },
      transport,
    );

    await provider.generate('test');

    expect(capturedHeaders.Authorization).toBe('Bearer test-secret');
  });

  it('fails safely without transport unless mockMode is enabled', async () => {
    const provider = new LiteLLMProvider({ provider: 'litellm', baseUrl: 'http://localhost:4000' });

    await expect(provider.generate('test')).rejects.toMatchObject({
      code: 'NO_TRANSPORT',
      provider: 'litellm',
    });
  });

  it('supports mockMode without any network transport', async () => {
    const provider = new LiteLLMProvider({ provider: 'litellm', mockMode: true });

    const result = await provider.generate('Classifique a intenção: implementar feature');

    expect(JSON.parse(result).intention).toBe('DEVELOPMENT_TASK');
  });

  it('turns 429 and 5xx transport statuses into retryable LLMProviderError', async () => {
    const transport: LLMTransport = {
      post: async () => ({ status: 429, body: '{"error":"rate limit"}' }),
    };
    const provider = new LiteLLMProvider(
      { provider: 'litellm', baseUrl: 'http://localhost:4000', model: 'greenforge-large' },
      transport,
    );

    await expect(provider.generate('test')).rejects.toMatchObject({
      code: 'API_ERROR',
      provider: 'litellm',
      retryable: true,
    });
  });

  it('detects dropped params and emits a DROP DETECTED audit warning', async () => {
    const warnings: Array<{ source: string; message: string; metadata: Record<string, unknown> }> = [];
    const transport: LLMTransport = {
      post: async () => ({
        status: 200,
        body: JSON.stringify({
          choices: [{ message: { content: 'ok' } }],
          dropped_params: ['temperature'],
        }),
      }),
    };

    const provider = new LiteLLMProvider(
      { provider: 'litellm', baseUrl: 'http://localhost:4000', model: 'greenforge-large' },
      transport,
      {
        recordAuditWarning: (source, message, metadata) => warnings.push({ source, message, metadata }),
      },
    );

    await expect(provider.generate('test')).resolves.toBe('ok');

    expect(warnings).toEqual([
      {
        source: 'LiteLLMProvider',
        message: expect.stringContaining('DROP DETECTED'),
        metadata: expect.objectContaining({ droppedParams: ['temperature'] }),
      },
    ]);
  });

  it('hard-blocks real litellm transport in the factory when NODE_ENV is test', () => {
    process.env.NODE_ENV = 'test';
    const factory = new LLMProviderFactory();
    const transport: LLMTransport = {
      post: async () => ({ status: 200, body: '{}' }),
    };

    expect(() =>
      factory.createFromConfig(
        { provider: 'litellm', baseUrl: 'http://localhost:4000', model: 'greenforge-large' },
        transport,
      ),
    ).toThrow(LLMProviderError);

    try {
      factory.createFromConfig(
        { provider: 'litellm', baseUrl: 'http://localhost:4000', model: 'greenforge-large' },
        transport,
      );
    } catch (error) {
      expect(error).toMatchObject({
        code: 'TEST_HARD_BLOCK',
        provider: 'litellm',
        retryable: false,
      });
    }
  });

  it('does not hard-block litellm mockMode in the factory during tests', () => {
    process.env.NODE_ENV = 'test';
    const factory = new LLMProviderFactory();

    expect(factory.createFromConfig({ provider: 'litellm', mockMode: true })).toBeInstanceOf(LiteLLMProvider);
  });
});
