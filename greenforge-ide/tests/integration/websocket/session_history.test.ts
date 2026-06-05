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

describe('Session History Lacuna', () => {
  let ws: MockWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    ws = new MockWebSocket();
  });

  it('should send previous messages when a session is resumed', async () => {
    const existingMessages = [
      { role: 'user', parts: [{ text: 'Hello' }] },
      { role: 'model', parts: [{ text: 'Hi there!' }] }
    ];

    (SessionStore.getOrCreate as any).mockReturnValue({
      id: 'session-123',
      messages: existingMessages,
      workspace: '/workspace'
    });

    handleWSConnection(ws as any);

    const msg = {
      type: 'chat_message', // Ou um novo tipo 'resume_session'
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Hello again',
      workspacePath: '/workspace'
    };

    ws.emit('message', Buffer.from(JSON.stringify(msg)));

    // ATUALMENTE FALHA: O backend inicia o loop mas não envia o histórico existente para o frontend.
    // O frontend "esquece" as mensagens anteriores ao recarregar a página.
    await vi.waitFor(() => {
      expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('session_history'));
    });
  });
});
