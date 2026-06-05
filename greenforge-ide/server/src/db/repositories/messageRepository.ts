// server/src/db/repositories/messageRepository.ts
import { getDB } from '../init.js';
import { Message } from '../../types/session.js';

export class MessageRepository {
  /**
   * Adiciona uma nova mensagem à sessão
   */
  static create(message: Message): Message {
    const db = getDB();
    const stmt = db.prepare(`
      INSERT INTO messages (session_id, role, content, timestamp, tool_calls, tool_results)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = Math.floor(Date.now() / 1000);
    const result = stmt.run(
      message.sessionId,
      message.role,
      message.content,
      now,
      message.toolCalls ? JSON.stringify(message.toolCalls) : null,
      message.toolResults ? JSON.stringify(message.toolResults) : null
    );

    return {
      ...message,
      id: result.lastInsertRowid as number,
      timestamp: now
    };
  }

  /**
   * Busca todas as mensagens de uma sessão
   */
  static findBySessionId(sessionId: string): Message[] {
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC');
    const rows = stmt.all(sessionId) as any[];

    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : null,
      toolResults: row.tool_results ? JSON.parse(row.tool_results) : null
    }));
  }

  /**
   * Busca uma mensagem por ID
   */
  static findById(id: number): Message | null {
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM messages WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : null,
      toolResults: row.tool_results ? JSON.parse(row.tool_results) : null
    };
  }

  /**
   * Deleta todas as mensagens de uma sessão
   */
  static deleteBySessionId(sessionId: string): number {
    const db = getDB();
    const stmt = db.prepare('DELETE FROM messages WHERE session_id = ?');
    const result = stmt.run(sessionId);
    return Number(result.changes || 0);
  }

  /**
   * Conta o número de mensagens em uma sessão
   */
  static countBySessionId(sessionId: string): number {
    const db = getDB();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM messages WHERE session_id = ?');
    const result = stmt.get(sessionId) as { count: number };
    return result.count;
  }
}
