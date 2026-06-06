import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleWSConnection } from '@/server/src/ws/handler';
import { EventEmitter } from 'events';

const { VALID_SESSION_ID } = vi.hoisted(() => ({
  VALID_SESSION_ID: '550e8400-e29b-41d4-a716-446655440000'
}));

class MockWebSocket extends EventEmitter {
  readyState = 1;
  send = vi.fn();
  terminate = vi.fn();
}

vi.mock('@/server/src/agent/loop', () => ({
  runAgentLoop: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/server/src/db/sessions', () => ({
  SessionStore: {
    getOrCreate: vi.fn().mockReturnValue({ id: '550e8400-e29b-41d4-a716-446655440000', messages: [] }),
    clearSession: vi.fn(),
    updateMode: vi.fn(),
    createCheckpoint: vi.fn(),
  },
}));

describe('Backend - WebSocket Handler', () => {
  let ws: MockWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    ws = new MockWebSocket();
  });

  it('should reject messages without authentication token', async () => {
    handleWSConnection(ws as any);

    const msg = {
      type: 'chat_message',
      sessionId: VALID_SESSION_ID,
      content: 'Hello',
      workspacePath: 'C:\\workspace',
      mode: 'plan'
    };

    ws.emit('message', Buffer.from(JSON.stringify(msg)));

    await vi.waitFor(() => {
      expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('Não autenticado'));
    });
  });

  it('should handle /help slash command', async () => {
    handleWSConnection(ws as any);

    const msg = {
      type: 'chat_message',
      sessionId: VALID_SESSION_ID,
      content: '/help',
      workspacePath: 'C:\\workspace',
      auth_token: 'valid-token',
      mode: 'plan'
    };

    ws.emit('message', Buffer.from(JSON.stringify(msg)));

    await vi.waitFor(() => {
      expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('Comandos disponíveis'));
    });
  });

  it('should handle /reset slash command', async () => {
    handleWSConnection(ws as any);
    const { SessionStore } = await import('@/server/src/db/sessions');

    const msg = {
      type: 'chat_message',
      sessionId: VALID_SESSION_ID,
      content: '/reset',
      workspacePath: 'C:\\workspace',
      auth_token: 'valid-token',
      mode: 'plan'
    };

    ws.emit('message', Buffer.from(JSON.stringify(msg)));

    await vi.waitFor(() => {
      expect(SessionStore.clearSession).toHaveBeenCalledWith(VALID_SESSION_ID);
      expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('Sessão resetada'));
    });
  });

  it('should handle switch_mode', async () => {
    handleWSConnection(ws as any);
    const { SessionStore } = await import('@/server/src/db/sessions');

    const msg = {
      type: 'switch_mode',
      sessionId: VALID_SESSION_ID,
      mode: 'yolo'
    };

    ws.emit('message', Buffer.from(JSON.stringify(msg)));

    expect(SessionStore.updateMode).toHaveBeenCalledWith(VALID_SESSION_ID, 'yolo');
  });

  it('should handle cancel_agent', async () => {
    handleWSConnection(ws as any);

    const msg = {
      type: 'cancel_agent',
      sessionId: VALID_SESSION_ID
    };

    ws.emit('message', Buffer.from(JSON.stringify(msg)));

    await vi.waitFor(() => {
      expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('Cancelado pelo usuário'));
    });
  });
});
