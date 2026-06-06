import { describe, it, expect, beforeEach } from 'vitest';
import { SessionStore } from '@/server/src/db/sessions';
import { Database } from '@/server/src/db/init';

describe('Persistence - SQLite SessionStore', () => {
  beforeEach(() => {
    // Inicializa o banco de dados em memória ou reseta para cada teste
    // Dependendo de como initDB está implementado
  });

  it('should create and retrieve a session', () => {
    const sessionId = 'session-123';
    const workspacePath = '/test/workspace';
    
    SessionStore.getOrCreate(sessionId, workspacePath);
    const session = SessionStore.getOrCreate(sessionId, workspacePath);
    
    expect(session.id).toBe(sessionId);
    expect(session.workspacePath).toBe(workspacePath);
  });

  it('should save and retrieve messages', () => {
    const sessionId = 'session-msg';
    SessionStore.getOrCreate(sessionId, '/path');
    
    SessionStore.addMessage(sessionId, { role: 'user', content: 'Hello' });
    SessionStore.addMessage(sessionId, { role: 'assistant', content: 'Hi there' });
    
    const session = SessionStore.getOrCreate(sessionId, '/path');
    expect(session.messages).toHaveLength(2);
    expect(session.messages[0].content).toBe('Hello');
    expect(session.messages[1].role).toBe('assistant');
  });

  it('should clear session history', () => {
    const sessionId = 'session-clear';
    SessionStore.getOrCreate(sessionId, '/path');
    SessionStore.addMessage(sessionId, { role: 'user', content: 'Bye' });
    
    SessionStore.clearSession(sessionId);
    
    const session = SessionStore.getOrCreate(sessionId, '/path');
    expect(session.messages).toHaveLength(0);
  });

  it('should update session mode', () => {
    const sessionId = 'session-mode';
    SessionStore.getOrCreate(sessionId, '/path');
    
    SessionStore.updateMode(sessionId, 'yolo');
    const session = SessionStore.getOrCreate(sessionId, '/path');
    expect(session.mode).toBe('yolo');
  });
});
