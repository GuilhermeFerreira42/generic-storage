import Database from 'better-sqlite3';
import { TaskRecord, TaskStatus, SubtaskNode } from '../../core/types/Task.js';
import { CheckpointRecord } from '../../core/types/Checkpoint.js';

interface RawTaskRow {
  id: string;
  title: string;
  original_prompt: string;
  branch_name: string;
  worktree_path: string;
  status: string;
  plan_markdown: string | null;
  subtasks_graph: string | null;
  created_at: string;
  updated_at: string;
}

interface RawCheckpointRow {
  id: number;
  task_id: string;
  phase: string;
  metadata: string | null;
  created_at: string;
}

interface RawAuditWarningRow {
  id: number;
  source: string;
  message: string;
  metadata: string | null;
  created_at: string;
}

export interface AuditWarningRecord {
  id: number;
  source: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Repositório SQLite para persistência de tarefas e checkpoints.
 */
export class SQLiteRepository {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
  }

  /**
   * Inicializa o banco de dados, criando as tabelas se não existirem e ativando o modo WAL e Foreign Keys.
   */
  initialize(): void {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        original_prompt TEXT NOT NULL,
        branch_name TEXT NOT NULL UNIQUE,
        worktree_path TEXT NOT NULL UNIQUE,
        status TEXT CHECK(status IN (
          'PENDING', 'CLARIFYING', 'PLANNING', 
          'BUILDING', 'BUILDING_PARALLEL', 'JOINING',
          'REVIEWING', 'VERIFYING', 'COMPLETED', 'FAILED'
        )) DEFAULT 'PENDING',
        plan_markdown TEXT,
        subtasks_graph TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS checkpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        phase TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Cria uma nova tarefa no banco de dados.
   */
  createTask(task: Omit<TaskRecord, 'createdAt' | 'updatedAt'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, title, original_prompt, branch_name, worktree_path, status, plan_markdown, subtasks_graph)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const subtasksJson = task.subtasksGraph ? JSON.stringify(task.subtasksGraph) : null;
    
    stmt.run(
      task.id, 
      task.title, 
      task.originalPrompt, 
      task.branchName, 
      task.worktreePath, 
      task.status,
      task.planMarkdown || null,
      subtasksJson
    );
  }

  /**
   * Recupera uma tarefa pelo ID.
   */
  getTask(id: string): TaskRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id) as RawTaskRow | undefined;
    if (!row) return undefined;

    return {
      id: row.id,
      title: row.title,
      originalPrompt: row.original_prompt,
      branchName: row.branch_name,
      worktreePath: row.worktree_path,
      status: row.status as TaskStatus,
      planMarkdown: row.plan_markdown,
      subtasksGraph: row.subtasks_graph ? JSON.parse(row.subtasks_graph) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Atualiza o status de uma tarefa.
   */
  updateTaskStatus(id: string, status: TaskStatus): void {
    const stmt = this.db.prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const result = stmt.run(status, id);
    if (result.changes === 0) {
      throw new Error(`Task ${id} not found`);
    }
  }

  /**
   * Salva o grafo de subtarefas como JSON.
   */
  saveSubtasksGraph(id: string, graph: SubtaskNode[]): void {
    const stmt = this.db.prepare('UPDATE tasks SET subtasks_graph = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const result = stmt.run(JSON.stringify(graph), id);
    if (result.changes === 0) {
      throw new Error(`Task ${id} not found`);
    }
  }

  /**
   * Recupera o grafo de subtarefas.
   */
  getSubtasksGraph(id: string): SubtaskNode[] | null {
    const stmt = this.db.prepare('SELECT subtasks_graph FROM tasks WHERE id = ?');
    const row = stmt.get(id) as { subtasks_graph: string | null } | undefined;
    return row?.subtasks_graph ? JSON.parse(row.subtasks_graph) : null;
  }

  /**
   * Retorna todas as tasks cadastradas, opcionalmente filtradas por status.
   */
  listTasks(filter?: string): TaskRecord[] {
    let stmt;
    if (filter === 'active') {
      stmt = this.db.prepare("SELECT * FROM tasks WHERE status NOT IN ('COMPLETED', 'FAILED') ORDER BY created_at DESC");
    } else if (filter === 'completed') {
      stmt = this.db.prepare("SELECT * FROM tasks WHERE status IN ('COMPLETED', 'FAILED') ORDER BY created_at DESC");
    } else {
      stmt = this.db.prepare('SELECT * FROM tasks ORDER BY created_at DESC');
    }

    const rows = stmt.all() as RawTaskRow[];

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      originalPrompt: row.original_prompt,
      branchName: row.branch_name,
      worktreePath: row.worktree_path,
      status: row.status as TaskStatus,
      planMarkdown: row.plan_markdown,
      subtasksGraph: row.subtasks_graph ? JSON.parse(row.subtasks_graph) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Adiciona um checkpoint para uma tarefa.
   */
  addCheckpoint(taskId: string, phase: string, metadata: object | null): void {
    const stmt = this.db.prepare('INSERT INTO checkpoints (task_id, phase, metadata) VALUES (?, ?, ?)');
    stmt.run(taskId, phase, metadata ? JSON.stringify(metadata) : null);
  }

  /**
   * Recupera todos os checkpoints de uma tarefa.
   */
  getCheckpoints(taskId: string): CheckpointRecord[] {
    const stmt = this.db.prepare('SELECT * FROM checkpoints WHERE task_id = ? ORDER BY created_at ASC');
    const rows = stmt.all(taskId) as RawCheckpointRow[];
    
    return rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      phase: row.phase,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      createdAt: row.created_at
    }));
  }

  /**
   * Registra warning auditável sem vínculo obrigatório com task.
   */
  recordAuditWarning(source: string, message: string, metadata: Record<string, unknown> | null): void {
    const stmt = this.db.prepare('INSERT INTO audit_warnings (source, message, metadata) VALUES (?, ?, ?)');
    stmt.run(source, message, metadata ? JSON.stringify(metadata) : null);
  }

  /**
   * Recupera warnings auditáveis, opcionalmente filtrados por origem.
   */
  getAuditWarnings(source?: string): AuditWarningRecord[] {
    const stmt = source
      ? this.db.prepare('SELECT * FROM audit_warnings WHERE source = ? ORDER BY id ASC')
      : this.db.prepare('SELECT * FROM audit_warnings ORDER BY id ASC');
    const rows = (source ? stmt.all(source) : stmt.all()) as RawAuditWarningRow[];

    return rows.map(row => ({
      id: row.id,
      source: row.source,
      message: row.message,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      createdAt: row.created_at
    }));
  }

  /**
   * Executa uma função dentro de uma transação.
   */
  runInTransaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  /**
   * Retorna o modo de jornal atual (usado em testes).
   */
  getJournalMode(): string {
    return this.db.pragma('journal_mode', { simple: true }) as string;
  }

  /**
   * Retorna se as Foreign Keys estão ativas (usado em testes).
   */
  getForeignKeysEnabled(): boolean {
    return (this.db.pragma('foreign_keys', { simple: true }) as number) === 1;
  }

  /**
   * Fecha a conexão com o banco de dados.
   */
  close(): void {
    this.db.close();
  }
}
