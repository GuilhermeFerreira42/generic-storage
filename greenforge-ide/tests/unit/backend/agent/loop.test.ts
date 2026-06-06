import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAgentLoop } from '@/server/src/agent/loop';

// Mock dependências externas
const mockGenerateContentStream = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContentStream: mockGenerateContentStream
    }
  }
}));

vi.mock('@/server/src/db/sessions', () => ({
  SessionStore: {
    getOrCreate: vi.fn().mockReturnValue({ id: '550e8400-e29b-41d4-a716-446655440000', messages: [] }),
    save: vi.fn(),
    saveToolCall: vi.fn(),
  }
}));

describe('Agent Loop - runAgentLoop', () => {
  const mockOnEvent = vi.fn();
  const mockPendingApprovals = new Map();
  const abortController = new AbortController();

  const mockToolRegistry = {
    getGeminiToolDefinitions: vi.fn().mockReturnValue([]),
    getTool: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run a simple loop without tools', async () => {
    const mockResponseStream = {
      async *[Symbol.asyncIterator]() {
        yield { text: 'Hello, world!' };
      }
    };
    mockGenerateContentStream.mockResolvedValue(mockResponseStream);

    await runAgentLoop({
      userMessage: 'Hi',
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      workspacePath: '/path',
      toolRegistry: mockToolRegistry as any,
      mode: 'plan',
      signal: abortController.signal,
      pendingApprovals: mockPendingApprovals,
      onEvent: mockOnEvent,
    });

    expect(mockOnEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'agent_token',
      token: 'Hello, world!'
    }));
  });

  it('should handle tool calls and requests approval in plan mode', async () => {
    // Primeira resposta do LLM: chama uma tool
    const mockStream1 = {
      async *[Symbol.asyncIterator]() {
        yield { functionCalls: [{ name: 'write_file', args: { path: 'test.txt', content: 'hello' } }] };
      }
    };

    // Segunda resposta do LLM: finaliza
    const mockStream2 = {
      async *[Symbol.asyncIterator]() {
        yield { text: 'Done' };
      }
    };

    mockGenerateContentStream
      .mockResolvedValueOnce(mockStream1)
      .mockResolvedValueOnce(mockStream2);

    const mockTool = {
      isDestructive: true,
      describeAction: vi.fn().mockReturnValue('Creating test.txt'),
      execute: vi.fn().mockResolvedValue('Success'),
      previewDiff: vi.fn().mockReturnValue('+ hello')
    };
    mockToolRegistry.getTool.mockReturnValue(mockTool);

    // Simular aprovação manual
    const loopPromise = runAgentLoop({
      userMessage: 'Create a file',
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      workspacePath: '/path',
      toolRegistry: mockToolRegistry as any,
      mode: 'plan',
      signal: abortController.signal,
      pendingApprovals: mockPendingApprovals,
      onEvent: mockOnEvent,
    });

    // Esperar pelo evento de approval_required
    await vi.waitFor(() => {
      const calls = mockOnEvent.mock.calls.map(c => c[0].type);
      expect(calls).toContain('approval_required');
    }, { timeout: 3000 });

    // Aprovar a ação
    const approvalCall = mockOnEvent.mock.calls.find(c => c[0].type === 'approval_required')[0];
    const actionId = approvalCall.actionId;
    
    const pending = mockPendingApprovals.get(actionId);
    if (pending) {
      pending.resolve(true);
    }

    await loopPromise;

    expect(mockTool.execute).toHaveBeenCalled();
    expect(mockOnEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'tool_result', result: 'Success' }));
  });
});
