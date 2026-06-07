// server/src/db/sessions.ts
// Stub implementation for the SessionStore used in the agent loop.
// This file provides the interface contract; a full SQLite implementation
// would replace these stubs in production.

export interface Session {
  id: string
  workspacePath: string
  messages: any[]
  createdAt: number
  updatedAt: number
}

export const SessionStore = {
  getOrCreate: (sessionId: string, workspacePath: string): Session => ({
    id: sessionId,
    workspacePath,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }),
  save: (_session: Session): void => {},
  saveToolCall: (_sessionId: string, _toolCall: {
    id: string
    toolName: string
    input: Record<string, unknown>
    result: string
    approved: boolean | null
  }): void => {},
  createCheckpoint: (_sessionId: string, _description: string, _snapshot: unknown): void => {},
}
