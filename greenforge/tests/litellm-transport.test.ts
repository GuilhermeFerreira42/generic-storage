import { describe, expect, it, vi } from 'vitest';
import { FetchLLMTransport } from '../src/infrastructure/llm/FetchLLMTransport.js';
import { LLMProviderError } from '../src/infrastructure/llm/LLMProviderConfig.js';

describe('Fase 23 — FetchLLMTransport', () => {
  it('posts JSON using an injected fetch implementation without touching real network in tests', async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const transport = new FetchLLMTransport({ fetchImpl: fetchMock });

    const result = await transport.post(
      'http://localhost:4000/chat/completions',
      { 'Content-Type': 'application/json', 'x-greenforge-profile': 'large' },
      '{"model":"greenforge-large"}',
    );

    expect(result).toEqual({ status: 200, body: '{"ok":true}' });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-greenforge-profile': 'large',
        },
        body: '{"model":"greenforge-large"}',
      }),
    );
  });

  it('supports the fast small-pool endpoint on port 4001', async () => {
    const fetchMock = vi.fn(async () => new Response('small-ok', { status: 200 }));
    const transport = new FetchLLMTransport({ fetchImpl: fetchMock });

    const result = await transport.post(
      'http://localhost:4001/chat/completions',
      { 'x-greenforge-profile': 'small' },
      '{}',
    );

    expect(result.body).toBe('small-ok');
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4001/chat/completions');
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ method: 'POST' }));
  });

  it('wraps fetch failures in LLMProviderError without leaking secrets', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:4000 token-secret');
    });
    const transport = new FetchLLMTransport({ fetchImpl: fetchMock });

    await expect(transport.post('http://localhost:4000/chat/completions', {}, '{}'))
      .rejects.toMatchObject({
        code: 'TRANSPORT_ERROR',
        provider: 'litellm',
        retryable: true,
      });

    await transport.post('http://localhost:4000/chat/completions', {}, '{}').catch(error => {
      expect(error).toBeInstanceOf(LLMProviderError);
      expect((error as Error).message).not.toContain('token-secret');
    });
  });

  it('aborts requests when timeoutMs is reached', async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }),
    );
    const transport = new FetchLLMTransport({ fetchImpl: fetchMock, timeoutMs: 1 });

    await expect(transport.post('http://localhost:4000/chat/completions', {}, '{}'))
      .rejects.toMatchObject({ code: 'TRANSPORT_TIMEOUT', provider: 'litellm', retryable: true });
  });
});
