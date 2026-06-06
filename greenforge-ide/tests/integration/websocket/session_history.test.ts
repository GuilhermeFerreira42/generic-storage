import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleWSConnection } from '@/server/src/ws/handler';
import { SessionStore } from '@/server/src/db/sessions';
import { EventEmitter } from 'events';

// Teste para revelar a lacuna de histórico persistente entre sessões
// (Funcionalidade ⚠️ Parcial)

class MockWebSocket extends EventEmitter {
  readyState = 1;
  send = vi.fn();
}

vi.mock('@/server/src/db/sessions', () => ({
  SessionStore: {
    getOrCreate: vi.fn(),
    saveMessage: vi.fn(),
    listByWorkspace: vi.fn(),
    delete: vi.fn()
  }
}));

describe('Session History Lacuna', () => {
  let ws: MockWebSocket;
  let mockedSessionStore = vi.mocked(SessionStore);

  beforeEach(() => {
    vi.clearAllMocks();
    ws = new MockWebSocket();
    mockedSessionStore = vi.mocked(SessionStore);
  });

  it('should send previous messages when a session is resumed', async () => {
    const existingMessages = [
      { role: 'user', parts: [{ text: 'Hello' }] },
      { role: 'model', parts: [{ text: 'Hi there!' }] }
    ];

    mockedSessionStore.getOrCreate.mockReturnValue({
      id: 'session-123',
      messages: existingMessages,
      workspace: '/workspace'
    });

    handleWSConnection(ws as any);

    const msg = {
      type: 'chat_message',
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Hello again',
      workspacePath: '/workspace',
      auth_token: 'valid-token'
    };

    ws.emit('message', Buffer.from(JSON.stringify(msg)));

    // VERIFICADO: O backend agora envia o histórico existente para o frontend.
    await vi.waitFor(() => {
      expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('session_history'));
    });
  });
});
