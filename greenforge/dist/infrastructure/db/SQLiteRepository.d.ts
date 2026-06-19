import { TaskRecord, TaskStatus, SubtaskNode } from '../../core/types/Task.js';
import { CheckpointRecord } from '../../core/types/Checkpoint.js';
/**
 * Repositório SQLite para persistência de tarefas e checkpoints.
 */
export declare class SQLiteRepository {
    private db;
    constructor(dbPath: string);
    /**
     * Inicializa o banco de dados, criando as tabelas se não existirem e ativando o modo WAL e Foreign Keys.
     */
    initialize(): void;
    /**
     * Cria uma nova tarefa no banco de dados.
     */
    createTask(task: Omit<TaskRecord, 'createdAt' | 'updatedAt'>): void;
    /**
     * Recupera uma tarefa pelo ID.
     */
    getTask(id: string): TaskRecord | undefined;
    /**
     * Atualiza o status de uma tarefa.
     */
    updateTaskStatus(id: string, status: TaskStatus): void;
    /**
     * Salva o grafo de subtarefas como JSON.
     */
    saveSubtasksGraph(id: string, graph: SubtaskNode[]): void;
    /**
     * Recupera o grafo de subtarefas.
     */
    getSubtasksGraph(id: string): SubtaskNode[] | null;
    /**
     * Adiciona um checkpoint para uma tarefa.
     */
    addCheckpoint(taskId: string, phase: string, metadata: object | null): void;
    /**
     * Recupera todos os checkpoints de uma tarefa.
     */
    getCheckpoints(taskId: string): CheckpointRecord[];
    /**
     * Executa uma função dentro de uma transação.
     */
    runInTransaction<T>(fn: () => T): T;
    /**
     * Retorna o modo de jornal atual (usado em testes).
     */
    getJournalMode(): string;
    /**
     * Retorna se as Foreign Keys estão ativas (usado em testes).
     */
    getForeignKeysEnabled(): boolean;
    /**
     * Fecha a conexão com o banco de dados.
     */
    close(): void;
}
