import { execa } from 'execa';
import path from 'path';
import { existsSync } from 'fs';
/**
 * Gerencia o isolamento físico de tarefas utilizando Git Worktrees.
 */
export class WorktreeManager {
    repoRoot;
    worktreeRoot;
    constructor(repoRoot) {
        this.repoRoot = repoRoot;
        // Normalizamos o path para evitar problemas com / e \ no Windows
        this.worktreeRoot = path.normalize(path.resolve(repoRoot, '.git', 'greenforge-worktrees'));
    }
    /**
     * Valida se um taskId é seguro e segue as regras do sistema.
     * @param taskId ID da tarefa a ser validado.
     */
    validateTaskId(taskId) {
        if (!taskId || typeof taskId !== 'string') {
            throw new Error('taskId must be a non-empty string');
        }
        if (taskId.length < 1 || taskId.length > 80) {
            throw new Error('taskId length must be between 1 and 80 characters');
        }
        // Apenas letras, números, _, -, .
        const safePattern = /^[a-zA-Z0-9._-]+$/;
        if (!safePattern.test(taskId)) {
            throw new Error('taskId contains invalid characters. Only alphanumeric, _, -, and . are allowed');
        }
        // Não pode ser apenas um ponto, nem começar ou terminar com ponto
        if (taskId === '.' || taskId.startsWith('.') || taskId.endsWith('.')) {
            throw new Error('taskId cannot be "." and cannot start or end with a dot');
        }
        // Prevenção explícita de navegação de diretório
        if (taskId.includes('..') || taskId.includes('/') || taskId.includes('\\')) {
            throw new Error('taskId cannot contain path navigation characters');
        }
    }
    /**
     * Provisiona um novo worktree para uma tarefa.
     * @param taskId ID único da tarefa.
     */
    async provision(taskId) {
        this.validateTaskId(taskId);
        const branchName = `forge/task-${taskId}`;
        const wtPath = path.join(this.worktreeRoot, taskId);
        // 1. Validar se worktree já existe no disco
        if (existsSync(wtPath)) {
            throw new Error(`Worktree already exists at ${wtPath}`);
        }
        // 2. Validar se branch já existe
        const branchExists = await this.checkBranchExists(branchName);
        if (branchExists) {
            throw new Error(`Branch already exists: ${branchName}`);
        }
        // 3. Criar worktree
        try {
            await execa('git', ['worktree', 'add', wtPath, '-b', branchName], {
                cwd: this.repoRoot,
                shell: false,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to create worktree: ${message}`, { cause: error });
        }
        return {
            taskId,
            path: wtPath,
            branch: branchName,
        };
    }
    /**
     * Remove um worktree e sua branch associada.
     * @param taskId ID da tarefa.
     */
    async deprovision(taskId) {
        this.validateTaskId(taskId);
        const wtPath = path.join(this.worktreeRoot, taskId);
        const branchName = `forge/task-${taskId}`;
        // 1. Validar se worktree existe
        const list = await this.list();
        const exists = list.some(wt => wt.taskId === taskId);
        if (!exists) {
            throw new Error(`Worktree not found for task: ${taskId}`);
        }
        // 2. Remover worktree
        try {
            await execa('git', ['worktree', 'remove', wtPath, '--force'], {
                cwd: this.repoRoot,
                shell: false,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to remove worktree: ${message}`, { cause: error });
        }
        // 3. Remover branch
        try {
            await execa('git', ['branch', '-D', branchName], {
                cwd: this.repoRoot,
                shell: false,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to remove branch ${branchName}: ${message}`, { cause: error });
        }
    }
    /**
     * Lista os worktrees ativos gerenciados pelo GreenForge.
     */
    async list() {
        try {
            const { stdout } = await execa('git', ['worktree', 'list', '--porcelain'], {
                cwd: this.repoRoot,
                shell: false,
            });
            const worktrees = [];
            const lines = stdout.split('\n');
            let currentWt = null;
            for (const line of lines) {
                if (line.startsWith('worktree ')) {
                    const rawPath = line.replace('worktree ', '');
                    const wtPath = path.normalize(rawPath);
                    // Verificação segura usando path.relative
                    const relative = path.relative(this.worktreeRoot, wtPath);
                    const isInside = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
                    if (isInside) {
                        currentWt = {
                            path: wtPath,
                            taskId: path.basename(wtPath),
                        };
                    }
                    else {
                        currentWt = null;
                    }
                }
                else if (currentWt && line.startsWith('branch ')) {
                    currentWt.branch = line.replace('branch refs/heads/', '');
                    worktrees.push(currentWt);
                    currentWt = null;
                }
            }
            return worktrees;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to list worktrees: ${message}`, { cause: error });
        }
    }
    async checkBranchExists(branchName) {
        try {
            await execa('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`], {
                cwd: this.repoRoot,
                shell: false,
            });
            return true;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=WorktreeManager.js.map