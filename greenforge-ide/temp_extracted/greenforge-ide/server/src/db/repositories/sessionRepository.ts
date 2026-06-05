// server/src/db/repositories/sessionRepository.ts
import { getDB } from '../init.js';
import { Session, SessionStatus } from '../../types/session.js';

export class SessionRepository {
  /**
   * Cria uma nova sessão
   */
  static create(session: Session): Session {
    const db = getDB();
    const stmt = db.prepare(`
      INSERT INTO sessions (id, created_at, updated_at, status, project_path, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = Math.floor(Date.now() / 1000);
    stmt.run(
      session.id,
      now,
      now,
      session.status,
      session.projectPath || null,
      JSON.stringify(session.metadata || {})
    );

    return session;
  }

  /**
   * Busca uma sessão por ID
   */
  static findById(id: string): Session | null {
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status as SessionStatus,
      projectPath: row.project_path,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  /**
   * Atualiza uma sessão existente
   */
  static update(id: string, updates: Partial<Session>): Session | null {
    const db = getDB();
    const existing = this.findById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (updates.projectPath !== undefined) {
      fields.push('project_path = ?');
      values.push(updates.projectPath);
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    // Sempre atualiza o updated_at
    fields.push('updated_at = ?');
    values.push(Math.floor(Date.now() / 1000));

    if (fields.length === 0) return existing;

    const stmt = db.prepare(`
      UPDATE sessions SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values, id);

    return this.findById(id);
  }

  /**
   * Lista todas as sessões ativas
   */
  static listActive(): Session[] {
    const db = getDB();
    const stmt = db.prepare("SELECT * FROM sessions WHERE status = 'active' ORDER BY updated_at DESC");
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status as SessionStatus,
      projectPath: row.project_path,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  /**
   * Deleta uma sessão
   */
  static delete(id: string): boolean {
    const db = getDB();
    const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
    const result = stmt.run(id);
    return (result.changes || 0) > 0;
  }
}
