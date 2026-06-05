// server/src/db/sessions.ts
import { randomUUID } from 'crypto';
import { getDB } from './init.js';

export interface Session {
  id: string;
  workspace: string;
  mode: 'plan' | 'auto_edit' | 'yolo';
  title: string | null;
  messages: any[];
  createdAt: number;
  updatedAt: number;
}

export const SessionStore = {
  getOrCreate(id: string, workspacePath: string): Session {
    const db = getDB();
    const now = Date.now();

    const row = db.prepare(`
      SELECT * FROM sessions WHERE id = ?
    `).get(id) as Record<string, unknown> | undefined;

    if (!row) {
      db.prepare(`
        INSERT INTO sessions (id, workspace, mode, title, created_at, updated_at)
        VALUES (?, ?, 'auto_edit', NULL, ?, ?)
      `).run(id, workspacePath, now, now);

      return {
        id,
        workspace: workspacePath,
        mode: 'auto_edit',
        title: null,
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
    }

    // Carrega mensagens do banco
    const messageRows = db.prepare(`
      SELECT role, content FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(id) as Array<{ role: string; content: string }>;

    const messages = messageRows.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: JSON.parse(m.content),
    }));

    return {
      id: row.id as string,
      workspace: row.workspace as string,
      mode: row.mode as Session['mode'],
      title: row.title as string | null,
      messages,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  },

  save(session: Session): void {
    const db = getDB();
    const now = Date.now();

    db.prepare(`
      UPDATE sessions SET updated_at = ?, mode = ? WHERE id = ?
    `).run(now, session.mode, session.id);

    // Reescreve todas as mensagens (simples e confiável)
    db.prepare(`DELETE FROM messages WHERE session_id = ?`).run(session.id);

    const insertMsg = db.prepare(`
      INSERT INTO messages (id, session_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN');
    try {
      session.messages.forEach((msg, i) => {
        insertMsg.run(
          randomUUID(),
          session.id,
          msg.role,
          JSON.stringify(msg.content),
          now + i, // garante ordem
        );
      });
      db.exec('COMMIT');
    } catch(e) {
      db.exec('ROLLBACK');
      throw e;
    }
  },

  listByWorkspace(workspacePath: string): Array<{
    id: string;
    title: string | null;
    createdAt: number;
    updatedAt: number;
  }> {
    const db = getDB();
    return db.prepare(`
      SELECT id, title, created_at as createdAt, updated_at as updatedAt
      FROM sessions
      WHERE workspace = ?
      ORDER BY updated_at DESC
      LIMIT 50
    `).all(workspacePath) as Array<{
      id: string;
      title: string | null;
      createdAt: number;
      updatedAt: number;
    }>;
  },

  updateMode(id: string, mode: Session['mode']): void {
    getDB().prepare(`UPDATE sessions SET mode = ? WHERE id = ?`).run(mode, id);
  },

  delete(id: string): void {
    getDB().prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
  },

  clearSession(id: string): void {
    getDB().prepare(`DELETE FROM messages WHERE session_id = ?`).run(id);
  },

  saveToolCall(
    sessionId: string,
    call: {
      id: string;
      toolName: string;
      input: Record<string, unknown>;
      result: string;
      approved: boolean | null;
    },
  ): void {
    getDB().prepare(`
      INSERT INTO tool_calls (id, session_id, tool_name, input, result, approved, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      call.id,
      sessionId,
      call.toolName,
      JSON.stringify(call.input),
      call.result,
      call.approved === null ? null : call.approved ? 1 : 0,
      Date.now(),
    );
  },

  createCheckpoint(sessionId: string, description: string): string {
    const db = getDB();
    const session = SessionStore.getOrCreate(sessionId, '');
    const checkpointId = randomUUID();

    db.prepare(`
      INSERT INTO checkpoints (id, session_id, description, snapshot, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      checkpointId,
      sessionId,
      description,
      JSON.stringify(session.messages),
      Date.now(),
    );

    return checkpointId;
  },
};
