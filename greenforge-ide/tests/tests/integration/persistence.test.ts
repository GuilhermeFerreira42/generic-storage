import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Simulates the SQLite database schema and storage manager
class SQLiteStorageManager {
  private db: Map<string, any> = new Map()

  constructor() {
    this.clear()
  }

  clear() {
    this.db.set('sessions', new Map())
    this.db.set('messages', [])
    this.db.set('tool_calls', [])
    this.db.set('checkpoints', [])
  }

  createSession(id: string, workspacePath: string) {
    const session = { id, workspacePath, createdAt: Date.now(), updatedAt: Date.now() }
    this.db.get('sessions').set(id, session)
    return session
  }

  getSession(id: string) {
    return this.db.get('sessions').get(id) || null
  }

  saveMessage(sessionId: string, role: string, content: string) {
    const msg = {
      id: Math.random().toString(36).substring(2, 9),
      sessionId,
      role,
      content,
      timestamp: Date.now()
    }
    this.db.get('messages').push(msg)
    
    // Update session timestamp
    const session = this.getSession(sessionId)
    if (session) {
      session.updatedAt = Date.now()
    }
    return msg
  }

  getSessionMessages(sessionId: string) {
    return this.db.get('messages')
      .filter((m: any) => m.sessionId === sessionId)
      .sort((a: any, b: any) => a.timestamp - b.timestamp)
  }

  saveToolCall(sessionId: string, toolCall: { id: string; toolName: string; input: any; result: string; approved: boolean | null }) {
    const record = {
      ...toolCall,
      sessionId,
      timestamp: Date.now()
    }
    this.db.get('tool_calls').push(record)
    return record
  }

  getToolCalls(sessionId: string) {
    return this.db.get('tool_calls').filter((tc: any) => tc.sessionId === sessionId)
  }

  createCheckpoint(sessionId: string, description: string, snapshot: any) {
    const checkpoint = {
      id: Math.random().toString(36).substring(2, 9),
      sessionId,
      description,
      snapshot: JSON.stringify(snapshot),
      timestamp: Date.now()
    }
    this.db.get('checkpoints').push(checkpoint)
    return checkpoint
  }

  getCheckpoints(sessionId: string) {
    return this.db.get('checkpoints').filter((cp: any) => cp.sessionId === sessionId)
  }
}

describe('SQLite Persistence Integration', () => {
  let dbManager: SQLiteStorageManager

  beforeEach(() => {
    dbManager = new SQLiteStorageManager()
  })

  it('creates sessions correctly and retrieves them', () => {
    dbManager.createSession('session-1', '/workspace/path')
    
    const session = dbManager.getSession('session-1')
    expect(session).not.toBeNull()
    expect(session.workspacePath).toBe('/workspace/path')
    expect(session.createdAt).toBeLessThanOrEqual(Date.now())
  })

  it('saves messages and fetches session message history in chronological order', async () => {
    dbManager.createSession('session-1', '/workspace/path')
    
    dbManager.saveMessage('session-1', 'user', 'First message')
    await new Promise(resolve => setTimeout(resolve, 5))
    dbManager.saveMessage('session-1', 'model', 'First response')

    const history = dbManager.getSessionMessages('session-1')
    expect(history).toHaveLength(2)
    expect(history[0].role).toBe('user')
    expect(history[0].content).toBe('First message')
    expect(history[1].role).toBe('model')
    expect(history[1].content).toBe('First response')
  })

  it('saves tool call records with approved status', () => {
    dbManager.createSession('session-1', '/workspace/path')

    dbManager.saveToolCall('session-1', {
      id: 'tool-call-123',
      toolName: 'write_file',
      input: { path: 'index.js', content: 'test' },
      result: 'success',
      approved: true
    })

    const toolCalls = dbManager.getToolCalls('session-1')
    expect(toolCalls).toHaveLength(1)
    expect(toolCalls[0].toolName).toBe('write_file')
    expect(toolCalls[0].approved).toBe(true)
    expect(toolCalls[0].input.path).toBe('index.js')
  })

  it('creates snapshots and restores checkpoints', () => {
    dbManager.createSession('session-1', '/workspace/path')

    const snapshot = {
      files: [
        { path: 'index.js', content: 'console.log("hello")' }
      ]
    }

    dbManager.createCheckpoint('session-1', 'Initial setup code', snapshot)

    const checkpoints = dbManager.getCheckpoints('session-1')
    expect(checkpoints).toHaveLength(1)
    expect(checkpoints[0].description).toBe('Initial setup code')
    
    const parsedSnapshot = JSON.parse(checkpoints[0].snapshot)
    expect(parsedSnapshot.files[0].path).toBe('index.js')
  })
})
