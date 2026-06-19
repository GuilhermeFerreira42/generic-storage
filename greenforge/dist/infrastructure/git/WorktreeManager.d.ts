export interface WorktreeInfo {
    taskId: string;
    path: string;
    branch: string;
}
/**
 * Gerencia o isolamento físico de tarefas utilizando Git Worktrees.
 */
export declare class WorktreeManager {
    private readonly repoRoot;
    private readonly worktreeRoot;
    constructor(repoRoot: string);
    /**
     * Valida se um taskId é seguro e segue as regras do sistema.
     * @param taskId ID da tarefa a ser validado.
     */
    private validateTaskId;
    /**
     * Provisiona um novo worktree para uma tarefa.
     * @param taskId ID único da tarefa.
     */
    provision(taskId: string): Promise<WorktreeInfo>;
    /**
     * Remove um worktree e sua branch associada.
     * @param taskId ID da tarefa.
     */
    deprovision(taskId: string): Promise<void>;
    /**
     * Lista os worktrees ativos gerenciados pelo GreenForge.
     */
    list(): Promise<WorktreeInfo[]>;
    private checkBranchExists;
}
