import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionStore } from '@/server/src/db/sessions';
import { initDB } from '@/server/src/db/init';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import path from 'path';

// Use an in-memory database for testing
process.env.DB_PATH = ':memory:';

describe('SessionStore', () => {
  beforeEach(() => {
    // Re-initialize DB for each test to ensure a clean slate
    initDB();
  });

  it('should create and retrieve a session', () => {
    const sessionId = 'session-1';
    const workspace = '/workspace';
    
    const session = SessionStore.getOrCreate(sessionId, workspace);
    
    expect(session.id).toBe(sessionId);
    expect(session.workspace).toBe(workspace);
    expect(session.messages).toEqual([]);
  });

  it('should save and load messages', () => {
    const sessionId = 'session-2';
    const workspace = '/workspace';
    const session = SessionStore.getOrCreate(sessionId, workspace);
    
    session.messages = [
      { role: 'user', content: [{ type: 'text', text: 'hello' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'hi' }] }
    ];
    
    SessionStore.save(session);
    
    const loaded = SessionStore.getOrCreate(sessionId, workspace);
    expect(loaded.messages).toHaveLength(2);
    expect(loaded.messages[0].role).toBe('user');
  });

  it('should list sessions by workspace', () => {
    SessionStore.getOrCreate('s1', '/w1');
    SessionStore.getOrCreate('s2', '/w1');
    SessionStore.getOrCreate('s3', '/w2');
    
    const list = SessionStore.listByWorkspace('/w1');
    expect(list).toHaveLength(2);
  });

  it('should delete a session', () => {
    SessionStore.getOrCreate('s-del', '/w');
    SessionStore.delete('s-del');
    
    const list = SessionStore.listByWorkspace('/w');
    expect(list).toHaveLength(0);
  });
});
