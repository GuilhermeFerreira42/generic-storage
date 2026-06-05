import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleWSConnection } from '@/server/src/ws/handler';
import { EventEmitter } from 'events';

// Este teste serve como especificação para a funcionalidade de Comandos Slash (/)
// Atualmente deve FALHAR pois não há implementação no backend.

vi.mock('@/server/src/agent/loop', () => ({
  runAgentLoop: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/server/src/tools/registry', () => ({
  buildToolRegistry: vi.fn().mockReturnValue({}),
}));
vi.mock('@/server/src/db/sessions', () => ({
  SessionStore: {
    getOrCreate: vi.fn(),
    save: vi.fn(),
    updateMode: vi.fn(),
    createCheckpoint: vi.fn(),
    clearSession: vi.fn(),
  },
}));

class MockWebSocket extends EventEmitter {
  readyState = 1;
  send = vi.fn();
}

describe('Slash Commands (TDD)', () => {
  let ws: MockWebSocket;

  beforeEach(() => {
    ws = new MockWebSocket();
  });

  it('should process /help slash command', async () => {
    handleWSConnection(ws as any);

    const msg = {
      type: 'chat_message',
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      content: '/help',
      workspacePath: '/workspace',
      auth_token: 'valid-token'
    };

    ws.emit('message', Buffer.from(JSON.stringify(msg)));

    // Esperamos que o sistema responda com uma lista de comandos disponíveis
    // Em vez de iniciar um loop de agente normal.
    await vi.waitFor(() => {
      expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('Comandos disponíveis:'));
    });
  });

  it('should process /reset slash command to clear history', async () => {
    handleWSConnection(ws as any);

    const msg = {
      type: 'chat_message',
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      content: '/reset',
      workspacePath: '/workspace',
      auth_token: 'valid-token'
    };

    ws.emit('message', Buffer.from(JSON.stringify(msg)));

    // Deve confirmar o reset e limpar a store de sessão
    await vi.waitFor(() => {
      expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('Sessão resetada'));
    });
  });
});
