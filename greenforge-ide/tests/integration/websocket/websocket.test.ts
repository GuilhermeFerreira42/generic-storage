import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleWSConnection } from '@/server/src/ws/handler';
import { EventEmitter } from 'events';
import { runAgentLoop } from '@/server/src/agent/loop';

vi.mock('@/server/src/agent/loop', () => ({
  runAgentLoop: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/server/src/tools/registry', () => ({
  buildToolRegistry: vi.fn().mockReturnValue({}),
}));
vi.mock('@/server/src/tools/shell/executeCommand');
vi.mock('@/server/src/db/sessions', () => ({
  SessionStore: {
    getOrCreate: vi.fn().mockReturnValue({ messages: [] }),
    save: vi.fn(),
    updateMode: vi.fn(),
    createCheckpoint: vi.fn(),
    clearSession: vi.fn(),
  },
}));

class MockWebSocket extends EventEmitter {
  readyState = 1; // OPEN
  send = vi.fn();
  terminate = vi.fn();
}

describe('WebSocket Handler', () => {
  let ws: MockWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    ws = new MockWebSocket();
  });

  it('should handle chat_message and start agent loop', () => {
    handleWSConnection(ws as any);

    const msg = {
      type: 'chat_message',
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Hello',
      mode: 'auto_edit',
      workspacePath: '/workspace',
      auth_token: 'valid-token'
    };

    ws.emit('message', Buffer.from(JSON.stringify(msg)));

    expect(runAgentLoop).toHaveBeenCalledWith(expect.objectContaining({
      userMessage: 'Hello',
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      mode: 'auto_edit'
    }));
  });

  it('should handle terminal_command', async () => {
     const { executeTerminalCommand } = await import('@/server/src/tools/shell/executeCommand');
     (executeTerminalCommand as any).mockResolvedValue({ stdout: 'output', stderr: '', exitCode: 0 });

     handleWSConnection(ws as any);

     const msg = {
       type: 'terminal_command',
       sessionId: '550e8400-e29b-41d4-a716-446655440000',
       command: 'ls',
       workspacePath: '/workspace'
     };

     ws.emit('message', Buffer.from(JSON.stringify(msg)));

     await vi.waitFor(() => expect(ws.send).toHaveBeenCalled());
     expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('terminal_output'));
  });

  it('should send an error for invalid JSON', () => {
    handleWSConnection(ws as any);
    ws.emit('message', Buffer.from('invalid json'));
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('Mensagem inválida'));
  });

  it('should send an error for invalid schema', () => {
    handleWSConnection(ws as any);
    ws.emit('message', Buffer.from(JSON.stringify({ type: 'unknown' })));
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('Schema inválido'));
  });
});
