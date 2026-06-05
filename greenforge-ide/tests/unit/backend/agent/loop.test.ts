import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAgentLoop } from '@/server/src/agent/loop';
import { SessionStore } from '@/server/src/db/sessions';
import { ToolRegistry } from '@/server/src/tools/registry';
import { GoogleGenAI } from '@google/genai';

vi.mock('@google/genai');
vi.mock('@/server/src/db/sessions');
vi.mock('@/server/src/tools/registry');

describe('runAgentLoop', () => {
  let mockOnEvent: any;
  let mockToolRegistry: any;
  let mockPendingApprovals: Map<string, { resolve: (approved: boolean) => void }>;
  let abortController: AbortController;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnEvent = vi.fn();
    mockToolRegistry = new ToolRegistry();
    mockPendingApprovals = new Map();
    abortController = new AbortController();

    (SessionStore.getOrCreate as any).mockReturnValue({
      id: 'session-1',
      messages: [],
      workspace: '/workspace'
    });

    (mockToolRegistry.getGeminiToolDefinitions as any).mockReturnValue([]);
  });

  it('should run a simple loop and complete', async () => {
    const mockResponseStream = {
      async *[Symbol.asyncIterator]() {
        yield { text: 'Hello!' };
      }
    };

    const mockGenerateContentStream = vi.fn().mockResolvedValue(mockResponseStream);
    (GoogleGenAI as any).mockImplementation(() => ({
      models: {
        generateContentStream: mockGenerateContentStream
      }
    }));

    await runAgentLoop({
      userMessage: 'Hi',
      sessionId: 'session-1',
      workspacePath: '/workspace',
      toolRegistry: mockToolRegistry,
      mode: 'auto_edit',
      signal: abortController.signal,
      pendingApprovals: mockPendingApprovals,
      onEvent: mockOnEvent
    });

    expect(mockOnEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'agent_token', token: 'Hello!' }));
    expect(mockOnEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'agent_done' }));
  });

  it('should handle tool calls and approvals', async () => {
    const mockTool = {
      name: 'write_file',
      isDestructive: true,
      execute: vi.fn().mockResolvedValue('File written'),
      describeAction: vi.fn().mockReturnValue('Writing file'),
      previewDiff: vi.fn().mockReturnValue('diff contents')
    };

    (mockToolRegistry.getTool as any).mockReturnValue(mockTool);

    const mockResponseStreamWithTool = {
      async *[Symbol.asyncIterator]() {
        yield { functionCalls: [{ name: 'write_file', args: { path: 'test.txt', content: 'hello' } }] };
      }
    };

    const mockResponseStreamFinal = {
      async *[Symbol.asyncIterator]() {
        yield { text: 'Done' };
      }
    };

    const mockGenerateContentStream = vi.fn()
      .mockResolvedValueOnce(mockResponseStreamWithTool)
      .mockResolvedValueOnce(mockResponseStreamFinal);

    (GoogleGenAI as any).mockImplementation(() => ({
      models: {
        generateContentStream: mockGenerateContentStream
      }
    }));

    // Simulate user approval
    const agentPromise = runAgentLoop({
      userMessage: 'Create a file',
      sessionId: 'session-1',
      workspacePath: '/workspace',
      toolRegistry: mockToolRegistry,
      mode: 'auto_edit',
      signal: abortController.signal,
      pendingApprovals: mockPendingApprovals,
      onEvent: mockOnEvent
    });

    // Wait for the loop to reach approval state
    await vi.waitFor(() => expect(mockOnEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'approval_required' })));

    const actionId = mockOnEvent.mock.calls.find(call => call[0].type === 'approval_required')[0].actionId;
    mockPendingApprovals.get(actionId)?.resolve(true);

    await agentPromise;

    expect(mockTool.execute).toHaveBeenCalled();
    expect(mockOnEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'tool_result', result: 'File written' }));
  });
});
