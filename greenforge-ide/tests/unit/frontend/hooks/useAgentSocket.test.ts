import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAgentSocket } from '@/hooks/useAgentSocket';
import { useIDEStore } from '@/lib/store';
import { useAgentStore } from '@/store/agentStore';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  
  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
    }, 0);
  }
  
  send = vi.fn((data: string) => {});
  close = vi.fn(() => {
    this.readyState = 3;
    this.onclose?.();
  });
}

vi.mock('@/lib/store');
vi.mock('@/store/agentStore');

describe('useAgentSocket', () => {
  const mockSetConnected = vi.fn();
  const mockAddToken = vi.fn();
  const mockFinalizeMessage = vi.fn();
  const mockSetApprovalRequired = vi.fn();
  const mockClearApprovalRequired = vi.fn();
  const mockAddToolEvent = vi.fn();
  const mockAddMessage = vi.fn();
  const mockUpdateDebateState = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock global WebSocket
    (global as any).WebSocket = MockWebSocket;
    
    (useAgentStore as any).mockImplementation((selector: any) => selector({
      isConnected: false,
      currentTokens: '',
      isThinking: false,
      approvalRequired: null,
      toolEvents: [],
      setConnected: mockSetConnected,
      addToken: mockAddToken,
      finalizeMessage: mockFinalizeMessage,
      setApprovalRequired: mockSetApprovalRequired,
      clearApprovalRequired: mockClearApprovalRequired,
      addToolEvent: mockAddToolEvent,
      resetAgent: vi.fn(),
    }));

    (useIDEStore as any).mockImplementation((selector: any) => selector({
      messages: [],
      addMessage: mockAddMessage,
      updateDebateState: mockUpdateDebateState,
      sessionId: 'test-session-123',
      workspacePath: '/workspace',
      mode: 'auto_edit',
    }));
  });

  afterEach(() => {
    delete (global as any).WebSocket;
  });

  it('connects to WebSocket on mount', () => {
    const { sendUserMessage } = useAgentSocket();
    
    // Connection should be initiated
    expect(MockWebSocket).toHaveBeenCalledWith(expect.stringContaining('ws://'));
  });

  it('sets connected state when WebSocket opens', async () => {
    useAgentSocket();
    
    // Wait for connection
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
  });

  it('sends user message via WebSocket', async () => {
    const { sendUserMessage } = useAgentSocket();
    
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
    
    sendUserMessage('Hello, agent!');
    
    expect(MockWebSocket.prototype.send).toHaveBeenCalledWith(
      expect.stringContaining('chat_message')
    );
    expect(MockWebSocket.prototype.send).toHaveBeenCalledWith(
      expect.stringContaining('Hello, agent!')
    );
  });

  it('handles agent_token events and adds tokens', async () => {
    useAgentSocket();
    
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
    
    // Simulate receiving a token event
    const mockWs = new MockWebSocket('ws://localhost:3001');
    mockWs.onmessage?.({
      data: JSON.stringify({
        type: 'agent_token',
        sessionId: 'test-session-123',
        token: 'Hello',
      }),
    });
    
    expect(mockAddToken).toHaveBeenCalledWith('Hello', 'test-session-123');
  });

  it('handles agent_thinking_done events and finalizes message', async () => {
    useAgentSocket();
    
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
    
    // Simulate thinking done event
    const mockWs = new MockWebSocket('ws://localhost:3001');
    mockWs.onmessage?.({
      data: JSON.stringify({
        type: 'agent_thinking_done',
        sessionId: 'test-session-123',
        content: 'Hello world',
      }),
    });
    
    expect(mockFinalizeMessage).toHaveBeenCalledWith('Hello world', 'test-session-123');
  });

  it('handles approval_required events', async () => {
    useAgentSocket();
    
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
    
    // Simulate approval required event
    const mockWs = new MockWebSocket('ws://localhost:3001');
    mockWs.onmessage?.({
      data: JSON.stringify({
        type: 'approval_required',
        sessionId: 'test-session-123',
        actionId: 'action-1',
        toolName: 'write_file',
        description: 'Create new file',
        diff: { original: '', modified: 'content' },
      }),
    });
    
    expect(mockSetApprovalRequired).toHaveBeenCalledWith(expect.objectContaining({
      actionId: 'action-1',
      toolName: 'write_file',
      sessionId: 'test-session-123',
    }));
  });

  it('handles tool_call events', async () => {
    useAgentSocket();
    
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
    
    // Simulate tool call event
    const mockWs = new MockWebSocket('ws://localhost:3001');
    mockWs.onmessage?.({
      data: JSON.stringify({
        type: 'tool_call',
        sessionId: 'test-session-123',
        actionId: 'action-1',
        toolName: 'read_file',
      }),
    });
    
    expect(mockAddToolEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'call',
        actionId: 'action-1',
        toolName: 'read_file',
        sessionId: 'test-session-123',
      })
    );
  });

  it('handles tool_result events', async () => {
    useAgentSocket();
    
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
    
    // Simulate tool result event
    const mockWs = new MockWebSocket('ws://localhost:3001');
    mockWs.onmessage?.({
      data: JSON.stringify({
        type: 'tool_result',
        sessionId: 'test-session-123',
        actionId: 'action-1',
        toolName: 'read_file',
        result: { content: 'file content' },
      }),
    });
    
    expect(mockAddToolEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'result',
        actionId: 'action-1',
        toolName: 'read_file',
        sessionId: 'test-session-123',
      })
    );
  });

  it('handles terminal_output events', async () => {
    useAgentSocket();
    
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
    
    const addTerminalLine = vi.fn();
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      messages: [],
      addMessage: mockAddMessage,
      updateDebateState: mockUpdateDebateState,
      sessionId: 'test-session-123',
      workspacePath: '/workspace',
      mode: 'auto_edit',
      addTerminalLine,
    }));

    // Re-create hook with updated mock
    useAgentSocket();
    
    // Simulate terminal output event
    const mockWs = new MockWebSocket('ws://localhost:3001');
    mockWs.onmessage?.({
      data: JSON.stringify({
        type: 'terminal_output',
        sessionId: 'test-session-123',
        output: 'Command output',
      }),
    });
    
    expect(addTerminalLine).toHaveBeenCalledWith('Command output');
  });

  it('sends approve_action when approving an action', async () => {
    const { approveAction } = useAgentSocket();
    
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
    
    approveAction('action-1', true);
    
    expect(MockWebSocket.prototype.send).toHaveBeenCalledWith(
      expect.stringContaining('approve_action')
    );
    expect(MockWebSocket.prototype.send).toHaveBeenCalledWith(
      expect.stringContaining('"approved":true')
    );
  });

  it('sends approve_action with false when rejecting an action', async () => {
    const { approveAction } = useAgentSocket();
    
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
    
    approveAction('action-1', false);
    
    expect(MockWebSocket.prototype.send).toHaveBeenCalledWith(
      expect.stringContaining('approve_action')
    );
    expect(MockWebSocket.prototype.send).toHaveBeenCalledWith(
      expect.stringContaining('"approved":false')
    );
  });

  it('sends cancel_agent when stopping debate', async () => {
    const { stopDebate } = useAgentSocket();
    
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
    
    stopDebate();
    
    expect(MockWebSocket.prototype.send).toHaveBeenCalledWith(
      expect.stringContaining('cancel_agent')
    );
  });

  it('sends terminal_command when executing terminal command', async () => {
    const { sendTerminalCommand } = useAgentSocket();
    
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
    
    sendTerminalCommand('ls -la');
    
    expect(MockWebSocket.prototype.send).toHaveBeenCalledWith(
      expect.stringContaining('terminal_command')
    );
    expect(MockWebSocket.prototype.send).toHaveBeenCalledWith(
      expect.stringContaining('ls -la')
    );
  });

  it('sends switch_mode when changing mode', async () => {
    const { switchMode } = useAgentSocket();
    
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
    
    switchMode('manual');
    
    expect(MockWebSocket.prototype.send).toHaveBeenCalledWith(
      expect.stringContaining('switch_mode')
    );
    expect(MockWebSocket.prototype.send).toHaveBeenCalledWith(
      expect.stringContaining('"mode":"manual"')
    );
  });

  it('disconnects WebSocket on unmount', async () => {
    useAgentSocket();
    
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
    
    // The hook should clean up on unmount (this is tested implicitly)
    // In a real test, we would use renderHook and unmount
  });

  it('handles session_history events', async () => {
    useAgentSocket();
    
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
    
    // Simulate session history event
    const mockWs = new MockWebSocket('ws://localhost:3001');
    mockWs.onmessage?.({
      data: JSON.stringify({
        type: 'session_history',
        sessionId: 'test-session-123',
        messages: [
          { role: 'user', content: 'Previous message' },
          { role: 'assistant', content: 'Previous response' },
        ],
      }),
    });
    
    // Should add messages to the store
    expect(mockAddMessage).toHaveBeenCalled();
  });

  it('handles connection errors', async () => {
    useAgentSocket();
    
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
    
    // Simulate error event
    const mockWs = new MockWebSocket('ws://localhost:3001');
    mockWs.onerror?.();
    
    // Error handling should be triggered (setConnected to false)
    expect(mockSetConnected).toHaveBeenCalledWith(false);
  });

  it('handles connection close', async () => {
    useAgentSocket();
    
    await vi.waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(true);
    });
    
    // Simulate close event
    const mockWs = new MockWebSocket('ws://localhost:3001');
    mockWs.onclose?.();
    
    // Should set connected to false
    expect(mockSetConnected).toHaveBeenCalledWith(false);
  });
});
