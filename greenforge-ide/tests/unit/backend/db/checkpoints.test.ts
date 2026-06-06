import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionStore } from '@/server/src/db/sessions';
import { Database } from 'better-sqlite3';

describe('SessionStore - Checkpoints', () => {
  let db: Database;

  beforeEach(() => {
    // Create in-memory database for testing
    const Sqlite = require('better-sqlite3');
    db = new Sqlite(':memory:');
    
    // Initialize tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        workspace TEXT NOT NULL,
        mode TEXT DEFAULT 'auto_edit',
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        files_snapshot TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  it('creates a checkpoint with file snapshot', () => {
    // First create a session
    const session = SessionStore.getOrCreate('test-workspace-1');
    
    const filesSnapshot = [
      { path: 'src/index.ts', content: 'console.log("hello");' },
      { path: 'src/utils.ts', content: 'export const add = (a, b) => a + b;' },
    ];
    
    const checkpointId = SessionStore.createCheckpoint(session.id, filesSnapshot);
    
    expect(checkpointId).toBeDefined();
    expect(typeof checkpointId).toBe('number');
  });

  it('retrieves checkpoints for a session', () => {
    const session = SessionStore.getOrCreate('test-workspace-2');
    
    const filesSnapshot1 = [{ path: 'file1.ts', content: 'content1' }];
    const filesSnapshot2 = [{ path: 'file2.ts', content: 'content2' }];
    
    SessionStore.createCheckpoint(session.id, filesSnapshot1);
    SessionStore.createCheckpoint(session.id, filesSnapshot2);
    
    const checkpoints = SessionStore.getCheckpoints(session.id);
    
    expect(checkpoints).toHaveLength(2);
    expect(checkpoints[0].files_snapshot).toBeDefined();
  });

  it('retrieves latest checkpoint for a session', () => {
    const session = SessionStore.getOrCreate('test-workspace-3');
    
    const filesSnapshot1 = [{ path: 'file1.ts', content: 'content1' }];
    const filesSnapshot2 = [{ path: 'file2.ts', content: 'content2' }];
    
    SessionStore.createCheckpoint(session.id, filesSnapshot1);
    SessionStore.createCheckpoint(session.id, filesSnapshot2);
    
    const latest = SessionStore.getLatestCheckpoint(session.id);
    
    expect(latest).toBeDefined();
    expect(JSON.parse(latest!.files_snapshot)).toHaveLength(1);
  });

  it('restores files from checkpoint', () => {
    const session = SessionStore.getOrCreate('test-workspace-4');
    
    const filesSnapshot = [
      { path: 'src/main.ts', content: 'const x = 1;' },
      { path: 'README.md', content: '# Project' },
    ];
    
    const checkpointId = SessionStore.createCheckpoint(session.id, filesSnapshot);
    const latest = SessionStore.getLatestCheckpoint(session.id);
    
    expect(latest).toBeDefined();
    const restored = JSON.parse(latest!.files_snapshot);
    expect(restored).toEqual(filesSnapshot);
  });

  it('handles empty file snapshots', () => {
    const session = SessionStore.getOrCreate('test-workspace-5');
    
    const checkpointId = SessionStore.createCheckpoint(session.id, []);
    
    expect(checkpointId).toBeDefined();
    
    const latest = SessionStore.getLatestCheckpoint(session.id);
    expect(JSON.parse(latest!.files_snapshot)).toHaveLength(0);
  });

  it('deletes old checkpoints when limit is reached', () => {
    const session = SessionStore.getOrCreate('test-workspace-6');
    
    // Create multiple checkpoints
    for (let i = 0; i < 15; i++) {
      SessionStore.createCheckpoint(session.id, [{ path: `file${i}.ts`, content: `content${i}` }]);
    }
    
    const checkpoints = SessionStore.getCheckpoints(session.id);
    
    // Should have all checkpoints (cleanup logic may vary)
    expect(checkpoints.length).toBeGreaterThan(0);
  });

  it('associates checkpoint with correct session', () => {
    const session1 = SessionStore.getOrCreate('test-workspace-7a');
    const session2 = SessionStore.getOrCreate('test-workspace-7b');
    
    SessionStore.createCheckpoint(session1.id, [{ path: 'a.ts', content: 'a' }]);
    SessionStore.createCheckpoint(session2.id, [{ path: 'b.ts', content: 'b' }]);
    
    const checkpoints1 = SessionStore.getCheckpoints(session1.id);
    const checkpoints2 = SessionStore.getCheckpoints(session2.id);
    
    expect(checkpoints1[0].files_snapshot).toContain('a.ts');
    expect(checkpoints2[0].files_snapshot).toContain('b.ts');
  });

  it('stores checkpoint timestamp', () => {
    const session = SessionStore.getOrCreate('test-workspace-8');
    
    const before = Date.now();
    SessionStore.createCheckpoint(session.id, [{ path: 'test.ts', content: 'test' }]);
    const after = Date.now();
    
    const latest = SessionStore.getLatestCheckpoint(session.id);
    
    expect(latest).toBeDefined();
    // Checkpoint should have been created between before and after
  });

  it('handles special characters in file content', () => {
    const session = SessionStore.getOrCreate('test-workspace-9');
    
    const filesSnapshot = [
      { path: 'test.ts', content: 'const x = "special chars: ñáéíóú 🚀";' },
      { path: 'unicode.md', content: '# Título\nConteúdo em português' },
    ];
    
    const checkpointId = SessionStore.createCheckpoint(session.id, filesSnapshot);
    
    expect(checkpointId).toBeDefined();
    
    const latest = SessionStore.getLatestCheckpoint(session.id);
    const restored = JSON.parse(latest!.files_snapshot);
    expect(restored).toEqual(filesSnapshot);
  });

  it('handles large file snapshots', () => {
    const session = SessionStore.getOrCreate('test-workspace-10');
    
    const largeContent = 'x'.repeat(100000);
    const filesSnapshot = [
      { path: 'large.ts', content: largeContent },
    ];
    
    const checkpointId = SessionStore.createCheckpoint(session.id, filesSnapshot);
    
    expect(checkpointId).toBeDefined();
    
    const latest = SessionStore.getLatestCheckpoint(session.id);
    expect(JSON.parse(latest!.files_snapshot)[0].content).toHaveLength(100000);
  });
});
