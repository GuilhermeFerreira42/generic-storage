import { describe, it, expect, vi } from 'vitest';
import { QwenRouter } from '../src/infrastructure/llm/QwenRouter.js';
import { LLMProvider } from '../src/core/ports/LLMProvider.js';

describe('QwenRouter', () => {
  const mockLLM: LLMProvider = {
    generate: vi.fn(),
  };

  const createRouter = () => new QwenRouter(mockLLM);

  it('1. should return DEVELOPMENT_TASK when LLM is confident (0.9)', async () => {
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify({ intention: 'DEVELOPMENT_TASK', confidence: 0.9 }));
    const result = await createRouter().classify('Implement a new login feature');
    expect(result).toBe('DEVELOPMENT_TASK');
  });

  it('2. should return NORMAL_CHAT when LLM is confident (0.95) but intention is chat', async () => {
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify({ intention: 'NORMAL_CHAT', confidence: 0.95 }));
    const result = await createRouter().classify('How are you today?');
    expect(result).toBe('NORMAL_CHAT');
  });

  it('3. should fallback to NORMAL_CHAT when confidence is low (< 0.7)', async () => {
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify({ intention: 'DEVELOPMENT_TASK', confidence: 0.65 }));
    const result = await createRouter().classify('Maybe fix some bug?');
    expect(result).toBe('NORMAL_CHAT');
  });

  it('4. should return DEVELOPMENT_TASK when confidence is exactly 0.7', async () => {
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify({ intention: 'DEVELOPMENT_TASK', confidence: 0.7 }));
    const result = await createRouter().classify('Refactor the database');
    expect(result).toBe('DEVELOPMENT_TASK');
  });

  it('5. should fallback to NORMAL_CHAT when LLM returns invalid JSON', async () => {
    vi.mocked(mockLLM.generate).mockResolvedValue('Not a JSON response');
    const result = await createRouter().classify('Do something');
    expect(result).toBe('NORMAL_CHAT');
  });

  it('6. should fallback to NORMAL_CHAT when LLM returns empty response', async () => {
    vi.mocked(mockLLM.generate).mockResolvedValue('');
    const result = await createRouter().classify('...');
    expect(result).toBe('NORMAL_CHAT');
  });

  it('7. should fallback to NORMAL_CHAT when LLM fails (throws error)', async () => {
    vi.mocked(mockLLM.generate).mockRejectedValue(new Error('API Timeout'));
    const result = await createRouter().classify('Critical task');
    expect(result).toBe('NORMAL_CHAT');
  });

  it('8. should fallback to NORMAL_CHAT when intention is invalid (e.g. DELETE_EVERYTHING)', async () => {
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify({ intention: 'DELETE_EVERYTHING', confidence: 0.99 }));
    const result = await createRouter().classify('Danger zone');
    expect(result).toBe('NORMAL_CHAT');
  });

  it('9. should fallback to NORMAL_CHAT when confidence is missing', async () => {
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify({ intention: 'DEVELOPMENT_TASK' }));
    const result = await createRouter().classify('Fix it');
    expect(result).toBe('NORMAL_CHAT');
  });

  it('10. should fallback to NORMAL_CHAT when confidence is not a number (string "0.95")', async () => {
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify({ intention: 'DEVELOPMENT_TASK', confidence: '0.95' }));
    const result = await createRouter().classify('Fix it now');
    expect(result).toBe('NORMAL_CHAT');
  });

  it('11. should fallback to NORMAL_CHAT when confidence is > 1', async () => {
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify({ intention: 'DEVELOPMENT_TASK', confidence: 1.1 }));
    const result = await createRouter().classify('Impossible confidence');
    expect(result).toBe('NORMAL_CHAT');
  });

  it('12. should fallback to NORMAL_CHAT when confidence is < 0', async () => {
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify({ intention: 'DEVELOPMENT_TASK', confidence: -0.1 }));
    const result = await createRouter().classify('Negative confidence');
    expect(result).toBe('NORMAL_CHAT');
  });

  it('13. should fallback to NORMAL_CHAT when intention is missing', async () => {
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify({ confidence: 0.9 }));
    const result = await createRouter().classify('Missing intention');
    expect(result).toBe('NORMAL_CHAT');
  });
});
