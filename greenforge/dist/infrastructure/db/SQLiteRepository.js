import Database from 'better-sqlite3';
/**
 * Repositório SQLite para persistência de tarefas e checkpoints.
 */
export class SQLiteRepository {
    db;
    constructor(dbPath) {
        this.db = new Database(dbPath);
    }
    /**
     * Inicializa o banco de dados, criando as tabelas se não existirem e ativando o modo WAL e Foreign Keys.
     */
    initialize() {
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
    `);
    }
    /**
     * Cria uma nova tarefa no banco de dados.
     */
    createTask(task) {
        const stmt = this.db.prepare(`
      INSERT INTO tasks (id, title, original_prompt, branch_name, worktree_path, status, plan_markdown, subtasks_graph)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const subtasksJson = task.subtasksGraph ? JSON.stringify(task.subtasksGraph) : null;
        stmt.run(task.id, task.title, task.originalPrompt, task.branchName, task.worktreePath, task.status, task.planMarkdown || null, subtasksJson);
    }
    /**
     * Recupera uma tarefa pelo ID.
     */
    getTask(id) {
        const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
        const row = stmt.get(id);
        if (!row)
            return undefined;
        return {
            id: row.id,
            title: row.title,
            originalPrompt: row.original_prompt,
            branchName: row.branch_name,
            worktreePath: row.worktree_path,
            status: row.status,
            planMarkdown: row.plan_markdown,
            subtasksGraph: row.subtasks_graph ? JSON.parse(row.subtasks_graph) : null,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    /**
     * Atualiza o status de uma tarefa.
     */
    updateTaskStatus(id, status) {
        const stmt = this.db.prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        const result = stmt.run(status, id);
        if (result.changes === 0) {
            throw new Error(`Task ${id} not found`);
        }
    }
    /**
     * Salva o grafo de subtarefas como JSON.
     */
    saveSubtasksGraph(id, graph) {
        const stmt = this.db.prepare('UPDATE tasks SET subtasks_graph = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        const result = stmt.run(JSON.stringify(graph), id);
        if (result.changes === 0) {
            throw new Error(`Task ${id} not found`);
        }
    }
    /**
     * Recupera o grafo de subtarefas.
     */
    getSubtasksGraph(id) {
        const stmt = this.db.prepare('SELECT subtasks_graph FROM tasks WHERE id = ?');
        const row = stmt.get(id);
        return row?.subtasks_graph ? JSON.parse(row.subtasks_graph) : null;
    }
    /**
     * Adiciona um checkpoint para uma tarefa.
     */
    addCheckpoint(taskId, phase, metadata) {
        const stmt = this.db.prepare('INSERT INTO checkpoints (task_id, phase, metadata) VALUES (?, ?, ?)');
        stmt.run(taskId, phase, metadata ? JSON.stringify(metadata) : null);
    }
    /**
     * Recupera todos os checkpoints de uma tarefa.
     */
    getCheckpoints(taskId) {
        const stmt = this.db.prepare('SELECT * FROM checkpoints WHERE task_id = ? ORDER BY created_at ASC');
        const rows = stmt.all(taskId);
        return rows.map(row => ({
            id: row.id,
            taskId: row.task_id,
            phase: row.phase,
            metadata: row.metadata ? JSON.parse(row.metadata) : null,
            createdAt: row.created_at
        }));
    }
    /**
     * Executa uma função dentro de uma transação.
     */
    runInTransaction(fn) {
        return this.db.transaction(fn)();
    }
    /**
     * Retorna o modo de jornal atual (usado em testes).
     */
    getJournalMode() {
        return this.db.pragma('journal_mode', { simple: true });
    }
    /**
     * Retorna se as Foreign Keys estão ativas (usado em testes).
     */
    getForeignKeysEnabled() {
        return this.db.pragma('foreign_keys', { simple: true }) === 1;
    }
    /**
     * Fecha a conexão com o banco de dados.
     */
    close() {
        this.db.close();
    }
}
//# sourceMappingURL=SQLiteRepository.js.map